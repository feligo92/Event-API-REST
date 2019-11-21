const nodemailer = require('nodemailer');

function sendEmail(
    emailSender,
    passwordSender,
    emailReciver,
    subject,
    message
) {

    const transporter = nodemailer.createTransport({//transporter que gestiona el envío del mail
        service: 'gmail',
        auth: {
            user: emailSender,
            pass: passwordSender
        }
    });

    const mailOptions = {// gestiona las opciones del mail en particular
        from: emailSender,
        to: emailReciver,
        subject: subject,
        text: message
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

module.exports = sendEmail
