const express = require('express');
const colors = require('colors');//libreria para poner color a los console.log
const bodyParser = require('body-parser');//libreria para parsear 
const cors = require('cors');//liberia cors
const fs = require('fs');//libreria file system
const jwt = require('jsonwebtoken');//libreria para crear el jwt
const jwtChecker = require('express-jwt');//libreria para comprobar el jwt
const cookieParser = require('cookie-parser');//libreria para parsear cookies
const bcrypt = require('bcrypt');//libreria para hashear
const nodemailer = require('nodemailer'); //librería para mandar mails
const helmet = require('helmet');
const { check, validationResult } = require('express-validator');
const validator = require('validator');


const sendEmail = require('./alerter');//importamos nuestro alerter
const logger = require('./logger');//importamos nuestro logger

//Importar secretos
const secretsFile = fs.readFileSync('secrets.json'); //lo hacemos síncrono porque todo el código depende de que se haya leido
const secrets = JSON.parse(secretsFile);


//Crear servidor
const server = express();

//MiddleWare
server.use(helmet());
server.use(cors());
server.use(bodyParser.json());
server.use(cookieParser())
server.use(jwtChecker({   //como argumento le pasamos un objeto con la configuración
    secret: secrets["jwt_clave"],    //clave de la firma
    getToken: (req) => {   //funcion para obtener las cookies
        return req.cookies['jwt']; //devuelve la cookie con esa clave
    }
}).unless({ path: ['/register', '/login'] }))//objeto clave path valor array de strings con todos los paths en que no se le exige la cookie







//============================== ENDPOINTS ===================================

//===========CONFIG
server.get('/bigBrother', (req, res) => {
    jwt.verify(req.cookies['jwt'], secrets["jwt_clave"], (error, decoded) => {
        if (error) {
            logger.log('warning', `Intento de ingreso detectado:${req.body.email}`)
        }
        if (decoded.email === "raserazo92@gmail.com") {
            fs.readFile('combined.log', (err, filecontent) => {
                const data = filecontent
                res.send(data)
                logger.log('info', `Ingreso correcto a logs. Username:${req.body.email}`)
            })
        } else {
            sendEmail(
                secrets["miEmail"],
                secrets["miPassword"],
                secrets["miEmail"],
                'Alerta de posible intrusión',
                `Alguien no autorizado ha tratado de entrar al endpoint /bigBrother`
            )
            res.send({ "error": "no autorizado" })
        }
    })

})

server.post('/register', [
    check('email').trim().escape(),
    check('password').trim().escape()
], (req, res) => {
    fs.readFile('users.json', (error, filecontent) => {
        const users = JSON.parse(filecontent);
        const userFound = users.filter(e => e.email === req.body.email);
        if (userFound.length > 0) {
            res.send({ 'error': 'El usuario ya existe' })
        } else if (validator.isEmail(req.body.email)) {
            bcrypt.hash(req.body.password, 11, (err, hash) => {
                users.push({
                    "email": req.body.email,
                    "password": hash
                })
                fs.writeFile('users.json', JSON.stringify(users), () => {
                    logger.log('info', `Usuario registrado. Username:${req.body.email}`)
                    res.send({ 'ok': true })
                })
            })
        } else {
            res.send({ 'error': 'Introduce un email válido' })
        }

    })
})

server.post('/login', [
    check('email').trim().escape(),
    check('password').trim().escape()
], (req, res) => {
    fs.readFile('users.json', (error, filecontent) => {
        const users = JSON.parse(filecontent);
        const userFound = users.filter(e => e.email === req.body.email);
        if (userFound.length > 0) {
            if (userFound[0]['password'] === req.body.password) {
                const token = jwt.sign({ "email": req.body.email }, secrets["jwt_clave"]);//objeto con la informacion que devolvemos , y la clave de la firma
                res.header('Set-Cookie', `jwt=${token}; httponly; maxAge: 99999`);//respondemos con un header 'set-cookie', nombre=valor; info contextual;info contextual
                userFound[0]['token'] = token
                fs.writeFile('users.json', JSON.stringify(users), () => {
                    res.send({ "logged": true })
                })
            }
        }
    })
})

//========CRUD


server.post('/event', [
    check('eventName').trim().escape(),
    check('eventDate').trim(),
    check('eventLocation').trim().escape(),
], (req, res) => {
    const body = req.body;

    console.log(body)
    fs.readFile(
        'events.json',
        (error, fileContent) => {
            let strEventName = body["eventName"];
            let arrEvents = JSON.parse(fileContent)

            for (let i = 0; i < arrEvents.length; i++) {
                if (arrEvents[i]["eventName"] == strEventName) {

                    res.send({ "error": "Ese evento ya existe. Por favor, indique otro" });
                } else {
                    let newID = 0
                    for (let i = 0; i < arrEvents.length; i++) {
                        if (newID >= parseInt(arrEvents[i]['eventID'])) {
                            newID++
                        }
                    }
                    body['eventID'] = String(newID)
                    fs.readFile(
                        'events.json',
                        (error, myEvents) => {
                            console.log("aloha")
                            console.log(JSON.parse(myEvents));
                            let arrEvents = JSON.parse(myEvents);
                            arrEvents.push(body);

                            fs.writeFile(
                                'events.json',
                                JSON.stringify(arrEvents),
                                () => { console.log('Archivo editado con éxito!'.green, arrEvents) });
                        }
                    )

                }

            }
            res.send({ "ok": "Perfecto! Nuevo evento añadido!" });
        }
    )
})

server.get("/events", (req, res) => {
    console.log("He recibido una peticion Get al endpoint '/events'".green);
    fs.readFile(
        'events.json',
        (error, fileContent) => {
            res.send(JSON.parse(fileContent));
        }
    )


})

server.put('/event', (req, res) => {
    const body = req.body;
    fs.readFile(
        'events.json',
        (error, fileContent) => {
            let strEventID = body["eventID"];
            let arrEvents = JSON.parse(fileContent);
            let findEvent = true
            for (let i = 0; i < arrEvents.length; i++) {
                if (strEventID == arrEvents[i]["eventID"]) {
                    console.log(arrEvents[i])
                    arrEvents.splice(arrEvents[i], 1, body);
                    fs.writeFile('events.json',
                        JSON.stringify(arrEvents),

                        () => {
                            findEvent = false;
                            res.send({ "ok": "Perfecto! Evento modificado!" })
                        });

                }

            }
            if (findEvent == false) {
                res.send({ "Error": "Error! El Evento no existe!" })
            }
        }
    )

})

server.delete("/events/:id", (req, res) => {
    console.log("He recibido una peticion Delete al endpoint '/events/'".green);
    const eventID = decodeURI(req.params.id)
    fs.readFile(
        'events.json',
        (error, fileContent) => {
            let objSingleEvent
            let arrEvents = JSON.parse(fileContent)

            for (let i = 0; i < arrEvents.length; i++) {
                if (arrEvents[i]["eventID"] == eventID) {
                    arrEvents.splice([i], 1)
                }
            }
            fs.writeFile('data.json',
                JSON.stringify(arrEvents),
                () => {
                    res.send({ "ok": "Perfecto! Evento borrado!" });
                })
        }
    )


})














//Escuchando
server.listen(3000, () => {
    console.log('Escuchando en el puerto 3000'.rainbow)
})