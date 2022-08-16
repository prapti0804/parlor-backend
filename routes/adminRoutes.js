import express from "express";
import NodeMailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

import { Service } from "../model/services.js";
import { User } from "../model/user.js";
import { Appointment } from "../model/appointment.js";

const router = express.Router();
router.post('/addservice', async (req, res) => {
    const service = new Service({
        name: req.body.name,
        description: req.body.description,
        isActive: req.body.isActive
    });
    await service.save((err, result) => {
        if (err) {
            console.log(err);
            return res.status(400).send({
                message: "Failed to add service"
            });
        }
        return res.status(200).send({
            message: "Success"
        });
    });
});

router.get('/appointments', async (req, res) => {
    let result = await Appointment.find({ 'isConfirmed': false });
    let users = await Promise.all(result.map(async (app, i) => {
        return User.findOne({ _id: app.user }).then(function (user) {
            let u = { appointment: app, "user": user }
            return u
        });
    }));
    return res.status(200).send({ data: users });
});


router.post('/confirmappointment', async (req, res) => {
    const token = req.headers.authorization;
    const __dirname = path.resolve();
    const filePath = path.join(__dirname, '/templates/confirmEmail.html');
    const source = fs.readFileSync(filePath, 'utf-8').toString();
    const template = handlebars.default.compile(source);
    let appointment = await Appointment.findOneAndUpdate({ _id: req.body.id }, { isConfirmed: true });
    let user = await User.findOne({ _id: appointment.user });
    let ser = appointment.services.join("<br>");

    const replacements = {
        username: user.name,
        services: ser,
        date: appointment.date,
        time: appointment.time,
    };
    const htmlToSend = template(replacements);
    let transporter = NodeMailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAIL_ID,
            pass: process.env.PASSWORD
        }
    });
    let details = {
        from: process.env.MAIL_ID,
        to: user.email,
        subject: "Your Appointment Details at Avani Parlour",
        html: htmlToSend
    }
    transporter.sendMail(details, (err) => {
        if (err) {
            res.status(400).send({
                messaage: "Error occured"
            });
        }
    });
    return res.status(200).send({ message: 'Appointment booked successfully' });
});

export default router;