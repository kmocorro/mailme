let bodyParser = require('body-parser');
let moment = require('moment');
let mysql = require('../config').pool;
let formidable = require('formidable');
let nodemailer = require('nodemailer');
let mailer = require('../config').config;
let RateLimit = require('express-rate-limit');
let fs = require('fs');

/**
 * Kevin Mocorro
 * 2018-08-09
 * 15:33 - 16:14
 */

let limiter = new RateLimit({
    windowMs: 30*60*1000,
    max: 1,
    delayMs: 3*1000,
    message: "Too many requests, please try again after 30 minutes."
});

module.exports = function(app){

    app.use(limiter); // limit the request.
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    let transporter = nodemailer.createTransport(mailer.mail);

    /**
     * GET API for 2d bcode not running
     */
    app.get('/mailme', function(req, res){
        let mail_query = req.query;

        if(mail_query){

            let mail_credentials = {
                qty: mail_query.qty,
                tool: mail_query.tool
            };

            function mailGo(){
                return new Promise(function(resolve, reject){

                    // query mail recipients
                    mysql.getConnection(function(err, connection){
                        if(err){return reject(err)};

                        connection.query({
                            sql: 'SELECT * FROM tbl_mailme_recipients WHERE isActive = 1',
                        },  function(err, results){
                            if(err){return reject(err)};

                            if(typeof results[0] !== 'undefined' && results[0] !== null && results.length > 0){

                                let recipients = [];

                                for(let i=0; i<results.length;i++){
                                    recipients.push(
                                        results[i].email
                                    );
                                }

                                let mail_settings = {
                                    from: '"Automailer" <' +  mailer.mail.auth.user + '>',
                                    to: recipients,
                                    subject: '2D Reader Notification',
                                    html: '<p>Dear Engineers, <br><br> Found ' + mail_credentials.qty + ' consecutive invalid reading of wafers.  Please check your 2D Reader in ' + mail_credentials.tool + '. </p>'
                                }

                                transporter.sendMail(mail_settings, function(err, info){
                                    if(err){return reject(err)};
                                    resolve();
                                });

                            } else {
                                reject('No recipients found.');
                            }

                        });

                        connection.release();

                    });

                });
            }

            mailGo().then(function(){
                res.send('Successfully sent notification');
            },  function(err){
                if(err){res.send(err)};
            });
            
        } else {
            res.send('Error');
        }

    });

    /**
     * GET API for PolyPlot data
     */
    app.get('/polyplot', function(req, res){
        let poly_query = req.query;

        if(poly_query){

            let poly_credentials = {
                filename: poly_query.filename,
                group_name: poly_query.group
            };

            let poly_attachments = './public/poly/' + poly_credentials.filename;

            function mailPoly(){
                return new Promise(function(resolve, reject){

                    mysql.getConnection(function(err, connection){
                        if(err){return reject(err)};

                        connection.query({
                            sql: 'SELECT * FROM tbl_dataplot_recipients WHERE isActive = 1 AND group_name = ?',
                            values: [poly_credentials.group_name]
                        },  function(err, results){
                            if(err){return reject(err)};

                            if(typeof results[0] !== 'undefined' && results[0] !== null && results.length > 0){

                                let recipients = [];

                                for(let i=0; i<results.length;i++){ // loop through recipients
                                    recipients.push(
                                        results[i].email
                                    );
                                }

                                if(fs.existsSync(poly_attachments)){ // if File exists.
                                    
                                    let mail_settings = {
                                        from: '"Automailer" <' +  mailer.mail.auth.user + '>',
                                        to: recipients,
                                        subject: 'Poly Plot Notification',
                                        attachments:{
                                            filename: poly_credentials.filename,
                                            path: poly_attachments
                                        },
                                        html: '<p>Dear Engineers, <br><br> See attached file for Poly Plot. </p>'
                                    }
    
                                    transporter.sendMail(mail_settings, function(err, info){
                                        if(err){return reject(err)};
                                        resolve();
                                    });

                                } else {
                                    reject('File does not exists.');
                                }

                            } else {
                                return reject('No recipients found.');
                            }

                        });

                        connection.release();

                    });

                });
            }

            function mailPolyToAll(){
                return new Promise(function(resolve, reject){

                    mysql.getConnection(function(err, connection){
                        if(err){return reject(err)};

                        connection.query({
                            sql: 'SELECT * FROM tbl_dataplot_recipients WHERE isActive = 1',
                            values: [poly_credentials.group_name]
                        },  function(err, results){
                            if(err){return reject(err)};

                            if(typeof results[0] !== 'undefined' && results[0] !== null && results.length > 0){

                                let recipients = [];

                                for(let i=0; i<results.length;i++){ // loop through recipients
                                    recipients.push(
                                        results[i].email
                                    );
                                }

                                if(fs.existsSync(poly_attachments)){ // if File exists.
                                    
                                    let mail_settings = {
                                        from: '"Automailer" <' +  mailer.mail.auth.user + '>',
                                        to: recipients,
                                        subject: 'Poly Plot Notification',
                                        attachments:{
                                            filename: poly_credentials.filename,
                                            path: poly_attachments
                                        },
                                        html: '<p>Dear Engineers, <br><br> See attached file for Poly Plot. </p>'
                                    }
    
                                    transporter.sendMail(mail_settings, function(err, info){
                                        if(err){return reject(err)};
                                        resolve();
                                    });

                                } else {
                                    reject('File does not exists.');
                                }

                            } else {
                                return reject('No recipients found.');
                            }

                        });

                        connection.release();

                    });

                });
            }

            if(poly_credentials.group_name == 'polyteam'){

                mailPoly().then(function(){
                    res.send('Notification successfully sent to polyteam.');
                },  function(err){
                    res.send(err);
                });

            } else if(poly_credentials.group_name == 'allteam'){

                mailPolyToAll().then(function(){
                    res.send('Notification successfully sent to allteam.')
                },  function(err){
                    res.send(err);
                });

            } else {
                res.send('Wrong team.');
            }

        }

    });

}