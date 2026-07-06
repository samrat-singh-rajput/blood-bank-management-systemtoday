<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';

function sendOTPEmail($email, $otp) {
    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = getenv('SMTP_HOST') ?: 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = getenv('SMTP_USER') ?: 'sasrajputchauhan@gmail.com';
        $mail->Password   = getenv('SMTP_PASS') ?: 'jqkv wdxb mepj bpfh';
        $mail->SMTPSecure = (getenv('SMTP_SECURE') === 'ssl') ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int)(getenv('SMTP_PORT') ?: 587);

        // Recipients
        $fromEmail = getenv('SMTP_FROM_EMAIL') ?: 'sasrajputchauhan@gmail.com';
        $fromName  = getenv('SMTP_FROM_NAME') ?: 'Blood Bank Project';
        $mail->setFrom($fromEmail, $fromName);
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
