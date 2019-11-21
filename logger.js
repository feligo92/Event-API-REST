const winston = require ('winston');//libreria para hacer logs


const logger = winston.createLogger({
    'level': 'info',
    'format': winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    'transports': [
        new winston.transports.File({ //transporter para error
            filename:'error.log',
            level: 'error',
            tomestamp: true,
            maxsize: 10000000
        }),
        new winston.transports.File({//transporter para los demas logs
            filename:'combined.log',
            // level: 'info',//podemos omitirlo y cogera el nivel máximo de arriba
            tomestamp: true,
            maxsize: 10000000
        })
    ]
})


module.exports = logger