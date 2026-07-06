<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';

function sendOTPEmail($email, $otp) {
    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'sasrajputchauhan@gmail.com';
        $mail->Password   = 'jqkv wdxb mepj bpfh';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        // Recipients
        $mail->setFrom('sasrajputchauhan@gmail.com', 'Blood Bank Project');
        $mail->addAddress($email);

        // Content
        $mail->isHTML(true);
        $mail->Subject = 'Your OTP for Blood Bank Registration';
        $mail->Body    = "Your one-time password (OTP) for registration is: <b>$otp</b><br><br>It will expire in 5 minutes.<br><br>Please do not share this code with anyone.";
        $mail->AltBody = "Your one-time password (OTP) for registration is: $otp\n\nIt will expire in 5 minutes.\n\nPlease do not share this code with anyone.";

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Message could not be sent. Mailer Error: {$mail->ErrorInfo}");
        return false;
    }
}
