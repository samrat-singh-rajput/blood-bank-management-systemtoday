<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$_GET['action'] = 'send_otp';
$input = '{"phone":"6207286899", "email":"asrajputchauhan@gmail.com"}';
// Override file_get_contents inside api.php by redefining it?
// We can just set a global or modify api.php's constructor temporarily, but an easier way is to just use CURL to localhost since XAMPP is running.
