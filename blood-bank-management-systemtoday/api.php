
<?php
/**
 * Blood Bank API - Professional XAMPP Backend
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit();

class Database {
    private $host = 'localhost';
    private $user = 'root';
    private $pass = '';
    private $db   = 'bloodbank_system';
    public $conn;

    public function __construct() {
        $this->conn = @new mysqli($this->host, $this->user, $this->pass, $this->db);
        if ($this->conn->connect_error) {
            echo json_encode(["error" => "DB Connection Failed: " . $this->conn->connect_error . " (Please verify your XAMPP MySQL is running and database 'bloodbank_system' exists)"]);
            exit();
        }
    }

    public function query($sql, $params = [], $types = "") {
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            echo json_encode(["error" => "MySQL SQL Prepare Failed: " . $this->conn->error . " | Query: " . $sql]);
            exit();
        }
        if ($params) {
            $stmt->bind_param($types, ...$params);
        }
        if (!$stmt->execute()) {
            echo json_encode(["error" => "MySQL SQL Execution Failed: " . $stmt->error]);
            exit();
        }
        return $stmt->get_result();
    }

    public function execute($sql, $params = [], $types = "") {
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            echo json_encode(["error" => "MySQL SQL Prepare Failed: " . $this->conn->error . " | Query: " . $sql]);
            exit();
        }
        if ($params) {
            $stmt->bind_param($types, ...$params);
        }
        $res = $stmt->execute();
        if (!$res) {
            echo json_encode(["error" => "MySQL SQL Execution Failed: " . $stmt->error]);
            exit();
        }
        return $res;
    }
}

class BloodBankAPI {
    private $db;
    private $input;

    public function __construct() {
        $this->db = new Database();
        $this->input = json_decode(file_get_contents('php://input'), true);
    }

    public function handleRequest($action) {
        switch ($action) {
            case 'login': $this->login(); break;
            case 'send_otp': $this->sendOTP(); break;
            case 'verify_otp': $this->verifyOTP(); break;
            case 'check_email': $this->checkEmail(); break;
            case 'complete_signup': $this->completeSignup(); break;
            case 'get_users': $this->getUsers(); break;
            case 'get_requests': $this->getRequests(); break;
            case 'get_hospitals': $this->getHospitals(); break;
            case 'get_feedbacks': $this->getFeedbacks(); break;
            case 'add_hospital': $this->addHospital(); break;
            case 'add_request': $this->addRequest(); break;
            case 'add_feedback': $this->addFeedback(); break;
            case 'get_campaigns': $this->getCampaigns(); break;
            case 'send_message': $this->sendMessage(); break;
            case 'get_chat_history': $this->getChatHistory(); break;
            case 'get_all_chats': $this->getAllChats(); break;
            case 'update_request_status': $this->updateRequestStatus(); break;
            case 'delete_hospital': $this->deleteHospital(); break;
            case 'add_key': $this->addKey(); break;
            case 'get_keys': $this->getKeys(); break;
            case 'reply_feedback': $this->replyFeedback(); break;
            case 'toggle_user_status': $this->toggleUserStatus(); break;
            case 'get_certificates': $this->getCertificates(); break;
            case 'add_certificate': $this->addCertificate(); break;
            case 'get_appointments': $this->getAppointments(); break;
            case 'add_appointment': $this->addAppointment(); break;
            case 'update_profile': $this->updateProfile(); break;
            default: echo json_encode(["error" => "Invalid Action"]);
        }
    }

    private function login() {
        $u = $this->input['username'] ?? '';
        $p = $this->input['password'] ?? '';
        $r = $this->input['role'] ?? '';
        
        $res = $this->db->query("SELECT * FROM users WHERE (username=? OR email=? OR phone=?) AND role=?", [$u, $u, $u, $r], "ssss");
        $user = $res->fetch_assoc();
        
        // For default accounts, we check plain text if hash fails (for simulation compatibility)
        if ($user && (password_verify($p, $user['password']) || $p === $user['password'])) {
            $user['_id'] = $user['id'];
            unset($user['password']);
            echo json_encode(["user" => $user]);
        } else {
            echo json_encode(["error" => "Invalid credentials or role mismatch"]);
        }
    }

    private function sendOTP() {
        $phone = $this->input['phone'] ?? '';
        if (!$phone) { echo json_encode(["error" => "Phone number required"]); return; }

        // Check if phone already registered and verified
        $check = $this->db->query("SELECT id FROM users WHERE phone=? AND is_verified=1", [$phone], "s");
        if ($check->num_rows > 0) {
            echo json_encode(["error" => "Mobile number already registered."]); return;
        }

        $otp = strval(rand(100000, 999999));
        
        // Upsert OTP record
        $existing = $this->db->query("SELECT id FROM users WHERE phone=?", [$phone], "s");
        if ($existing->num_rows > 0) {
            $this->db->execute("UPDATE users SET otp=?, otp_expiry=DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE phone=?", [$otp, $phone], "ss");
        } else {
            $id = uniqid('PENDING_');
            $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
            $pendingUser = "pending_" . $cleanPhone;
            $pendingEmail = $pendingUser . "@example.com";
            $this->db->execute("INSERT INTO users (id, phone, otp, otp_expiry, status, is_verified, role, username, password, name, email) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), 'Pending', 0, 'USER', ?, '', 'Pending User', ?)", [$id, $phone, $otp, $pendingUser, $pendingEmail], "sssss");
        }

        // --- SMS API INTEGRATION ---
        $smsResult = $this->sendSMS($phone, $otp);
        
        $response = ["success" => true, "message" => "OTP process initiated"];
        
        // If SMS failed or Key is missing, we provide the OTP in the response for testing
        // You can remove "debug_otp" in production after your SMS is working.
        if ($smsResult === "KEY_MISSING") {
            $response["sms_status"] = "SIMULATED: Add Fast2SMS Key in api.php";
            $response["debug_otp"] = $otp;
        } else if ($smsResult) {
            $response["sms_status"] = "SENT_TO_PHONE";
            // Optional: Still provide debug_otp if you want to see it on screen during testing
            $response["debug_otp"] = $otp; 
        } else {
            $response["sms_status"] = "FAILED: Check Fast2SMS Balance/Logs";
            $response["debug_otp"] = $otp;
        }
        
        echo json_encode($response);
    }

    private function sendSMS($phone, $otp) {
        // Fast2SMS API Key provided by user
        $apiKey = "ESGAojrnpTJD41ViQM9w3ZFhPbdCIHftU0vO5gL2k8RY6Buz7x9Dp4bkyd68v0F72ClO1VRZAHwBsMxU"; 
        
        // Clean phone number (keep only digits)
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        // If it starts with 91 and is 12 digits, it's fine. If 10 digits, it's fine.
        // Fast2SMS usually takes 10 digit numbers for India.
        if (strlen($cleanPhone) > 10) {
            $cleanPhone = substr($cleanPhone, -10);
        }
        
        if (!$apiKey || $apiKey === "YOUR_REAL_FAST2SMS_KEY_HERE" || empty($apiKey)) {
            return "KEY_MISSING";
        }

        $fields = array(
            "variables_values" => $otp,
            "route" => "otp",
            "numbers" => $cleanPhone,
        );

        $curl = curl_init();
        curl_setopt_array($curl, array(
            CURLOPT_URL => "https://www.fast2sms.com/dev/bulkV2",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYHOST => 0,
            CURLOPT_SSL_VERIFYPEER => 0,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode($fields),
            CURLOPT_HTTPHEADER => array(
                "authorization: $apiKey",
                "accept: */*",
                "cache-control: no-cache",
                "content-type: application/json"
            ),
        ));

        $response = curl_exec($curl);
        $err = curl_error($curl);
        curl_close($curl);
        
        if ($err) {
            error_log("Fast2SMS CURL Error: " . $err);
            return false;
        }
        
        $resObj = json_decode($response, true);
        if (!$resObj) {
            error_log("Fast2SMS Invalid Response: " . $response);
            return false;
        }

        if (isset($resObj['return']) && $resObj['return'] === true) {
            return true;
        } else {
            error_log("Fast2SMS API Error: " . ($resObj['message'] ?? 'Unknown Error'));
            return false;
        }
    }

    private function verifyOTP() {
        $phone = $this->input['phone'] ?? '';
        $otp = $this->input['otp'] ?? '';
        
        $res = $this->db->query("SELECT * FROM users WHERE phone=? AND otp=? AND otp_expiry > NOW()", [$phone, $otp], "ss");
        if ($res->num_rows > 0) {
            $this->db->execute("UPDATE users SET is_verified=1 WHERE phone=?", [$phone], "s");
            echo json_encode(["success" => true, "message" => "OTP verified"]);
        } else {
            echo json_encode(["error" => "Invalid or expired OTP"]);
        }
    }

    private function completeSignup() {
        $phone = $this->input['phone'] ?? '';
        $user = $this->input['username'] ?? '';
        $pass = password_hash($this->input['password'] ?? '', PASSWORD_DEFAULT);
        $role = $this->input['role'] ?? 'USER';
        $name = $this->input['name'] ?? $user;
        $email = strtolower($this->input['email'] ?? '');
        $id = uniqid('BB_');
        $jd = date('Y-m-d');

        // Verify OTP was actually verified (check if record exists with this phone)
        $check = $this->db->query("SELECT id FROM users WHERE phone=? AND status='Pending'", [$phone], "s");
        if ($check->num_rows === 0) {
            echo json_encode(["error" => "Verification required."]); return;
        }

        // Check if username taken
        $uCheck = $this->db->query("SELECT id FROM users WHERE username=?", [$user], "s");
        if ($uCheck->num_rows > 0) {
            echo json_encode(["error" => "Username already taken."]); return;
        }

        $sql = "UPDATE users SET id=?, username=?, password=?, role=?, name=?, email=?, joinDate=?, status='Active', is_verified=1, otp=NULL, otp_expiry=NULL WHERE phone=?";
        if ($this->db->execute($sql, [$id, $user, $pass, $role, $name, $email, $jd, $phone], "ssssssss")) {
            $res = $this->db->query("SELECT * FROM users WHERE id=?", [$id], "s");
            $userData = $res->fetch_assoc();
            $userData['_id'] = $userData['id'];
            unset($userData['password']);
            echo json_encode(["user" => $userData]);
        } else {
            echo json_encode(["error" => "MySQL Storage Error."]);
        }
    }

    private function getUsers() {
        $res = $this->db->conn->query("SELECT * FROM users");
        $data = []; while($row = $res->fetch_assoc()) { $row['_id'] = $row['id']; unset($row['password']); $data[] = $row; }
        echo json_encode(["users" => $data]);
    }

    private function getRequests() {
        $res = $this->db->conn->query("SELECT * FROM requests ORDER BY date DESC");
        $data = []; while($row = $res->fetch_assoc()) { $row['_id'] = (string)$row['id']; $data[] = $row; }
        echo json_encode(["requests" => $data]);
    }

    private function getHospitals() {
        $res = $this->db->conn->query("SELECT * FROM hospitals");
        $data = []; while($row = $res->fetch_assoc()) { $row['_id'] = (string)$row['id']; $data[] = $row; }
        echo json_encode(["hospitals" => $data]);
    }

    private function getFeedbacks() {
        $res = $this->db->conn->query("SELECT * FROM feedback ORDER BY date DESC");
        $data = []; while($row = $res->fetch_assoc()) { $row['_id'] = (string)$row['id']; $data[] = $row; }
        echo json_encode(["feedback" => $data]);
    }

    private function getCampaigns() {
        $res = $this->db->conn->query("SELECT * FROM campaigns");
        $data = []; while($row = $res->fetch_assoc()) { $row['_id'] = (string)$row['id']; $data[] = $row; }
        echo json_encode(["campaigns" => $data]);
    }

    private function addHospital() {
        $n = $this->input['name'] ?? ''; $c = $this->input['city'] ?? ''; $a = $this->input['address'] ?? ''; $p = $this->input['phone'] ?? ''; $e = $this->input['email'] ?? '';
        $this->db->execute("INSERT INTO hospitals (name, city, address, phone, email) VALUES (?,?,?,?,?)", [$n, $c, $a, $p, $e], "sssss");
        echo json_encode(["success" => true]);
    }

    private function deleteHospital() {
        $id = $this->input['hospitalId'] ?? 0;
        $this->db->execute("DELETE FROM hospitals WHERE id=?", [$id], "i");
        echo json_encode(["success" => true]);
    }

    private function addRequest() {
        $dn = $this->input['donorName'] ?? ''; $bt = $this->input['bloodType'] ?? ''; $u = $this->input['urgency'] ?? 'Medium'; $h = $this->input['hospital'] ?? 'N/A'; $l = $this->input['location'] ?? ''; $p = $this->input['phone'] ?? ''; $t = $this->input['type'] ?? 'Request'; $d = $this->input['date'] ?? date('Y-m-d');
        $this->db->execute("INSERT INTO requests (donorName, bloodType, urgency, hospital, location, phone, type, date) VALUES (?,?,?,?,?,?,?,?)", [$dn, $bt, $u, $h, $l, $p, $t, $d], "ssssssss");
        echo json_encode(["success" => true]);
    }

    private function updateRequestStatus() {
        $id = $this->input['requestId'] ?? 0; $s = $this->input['status'] ?? 'Pending';
        $this->db->execute("UPDATE requests SET status=? WHERE id=?", [$s, $id], "si");
        echo json_encode(["success" => true]);
    }

    private function addFeedback() {
        $uid = $this->input['userId'] ?? ''; $role = $this->input['userRole'] ?? ''; $msg = $this->input['message'] ?? ''; $date = date('Y-m-d H:i:s');
        $this->db->execute("INSERT INTO feedback (userId, userRole, message, date) VALUES (?,?,?,?)", [$uid, $role, $msg, $date], "ssss");
        echo json_encode(["success" => true]);
    }

    private function replyFeedback() {
        $id = $this->input['feedbackId'] ?? 0; $r = $this->input['reply'] ?? '';
        $this->db->execute("UPDATE feedback SET reply=? WHERE id=?", [$r, $id], "si");
        echo json_encode(["success" => true]);
    }

    private function sendMessage() {
        $sid = $this->input['senderId'] ?? ''; $sn = $this->input['senderName'] ?? ''; $rid = $this->input['receiverId'] ?? ''; $rn = $this->input['receiverName'] ?? ''; $txt = $this->input['text'] ?? '';
        $this->db->execute("INSERT INTO messages (senderId, senderName, receiverId, receiverName, text) VALUES (?,?,?,?,?)", [$sid, $sn, $rid, $rn, $txt], "sssss");
        echo json_encode(["success" => true]);
    }

    private function getChatHistory() {
        $u1 = $this->input['user1Id']; $u2 = $this->input['user2Id'];
        $res = $this->db->query("SELECT * FROM messages WHERE (senderId=? AND receiverId=?) OR (senderId=? AND receiverId=?) ORDER BY timestamp ASC", [$u1, $u2, $u2, $u1], "ssss");
        $data = []; while($row = $res->fetch_assoc()) { $row['_id'] = (string)$row['id']; $data[] = $row; }
        echo json_encode(["history" => $data]);
    }

    private function getAllChats() {
        $uid = $this->input['userId'];
        $res = $this->db->query("SELECT * FROM messages WHERE senderId=? OR receiverId=? ORDER BY timestamp DESC", [$uid, $uid], "ss");
        $data = []; while($row = $res->fetch_assoc()) { $row['_id'] = (string)$row['id']; $data[] = $row; }
        echo json_encode(["chats" => $data]);
    }

    private function addKey() {
        $c = $this->input['code']; $oid = $this->input['ownerId']; $t = $this->input['type']; $d = $this->input['issuedDate'];
        $this->db->execute("INSERT INTO emergency_keys (code, ownerId, type, issuedDate) VALUES (?,?,?,?)", [$c, $oid, $t, $d], "ssss");
        echo json_encode(["success" => true]);
    }

    private function getKeys() {
        $uid = $this->input['userId'];
        $res = $this->db->query("SELECT * FROM emergency_keys WHERE ownerId=?", [$uid], "s");
        $data = []; while($row = $res->fetch_assoc()) { $row['_id'] = (string)$row['id']; $data[] = $row; }
        echo json_encode(["keys" => $data]);
    }

    private function toggleUserStatus() {
        $uid = $this->input['userId'];
        $res = $this->db->query("SELECT status FROM users WHERE id=?", [$uid], "s");
        $user = $res->fetch_assoc();
        $newStatus = ($user['status'] === 'Active') ? 'Blocked' : 'Active';
        $this->db->execute("UPDATE users SET status=? WHERE id=?", [$newStatus, $uid], "ss");
        echo json_encode(["success" => true, "newStatus" => $newStatus]);
    }

    private function getCertificates() {
        $uid = $this->input['donorId'];
        $res = $this->db->query("SELECT * FROM certificates WHERE donorId=?", [$uid], "s");
        $data = []; while($row = $res->fetch_assoc()) { $row['_id'] = (string)$row['id']; $data[] = $row; }
        echo json_encode(["certificates" => $data]);
    }

    private function addCertificate() {
        $uid = $this->input['donorId']; $d = $this->input['date']; $h = $this->input['hospitalName']; $img = $this->input['imageUrl'];
        $this->db->execute("INSERT INTO certificates (donorId, date, hospitalName, imageUrl) VALUES (?,?,?,?)", [$uid, $d, $h, $img], "ssss");
        echo json_encode(["success" => true]);
    }

    private function getAppointments() {
        $uid = $this->input['userId'];
        $res = $this->db->query("SELECT * FROM appointments WHERE donorId=?", [$uid], "s");
        $data = []; while($row = $res->fetch_assoc()) { $row['_id'] = (string)$row['id']; $data[] = $row; }
        echo json_encode(["appointments" => $data]);
    }

    private function addAppointment() {
        $h = $this->input['hospitalName']; $d = $this->input['date']; $t = $this->input['time']; $uid = $this->input['donorId'];
        $this->db->execute("INSERT INTO appointments (hospitalName, date, time, donorId) VALUES (?,?,?,?)", [$h, $d, $t, $uid], "ssss");
        echo json_encode(["success" => true]);
    }

    private function updateProfile() {
        $uid = $this->input['userId'];
        $fields = []; $params = []; $types = "";
        foreach ($this->input as $key => $val) {
            if ($key !== 'userId' && $key !== 'action') {
                $fields[] = "$key=?"; $params[] = $val; $types .= "s";
            }
        }
        $params[] = $uid; $types .= "s";
        $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id=?";
        $this->db->execute($sql, $params, $types);
        
        $res = $this->db->query("SELECT * FROM users WHERE id=?", [$uid], "s");
        $user = $res->fetch_assoc();
        $user['_id'] = $user['id'];
        unset($user['password']);
        echo json_encode(["user" => $user]);
    }
}

$api = new BloodBankAPI();
$api->handleRequest($_GET['action'] ?? '');
?>
