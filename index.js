require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const connection = require('./db');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const port = process.env.PORT || 8080;
const session = require('express-session');
const passport = require('passport');
const authstrategy = require('passport-google-oauth2').Strategy;
const userDb = require('./models/userSchema');
const nodemailer = require('nodemailer');

const clientID = process.env.CID
const clientSecret = process.env.CS

var nameid;

//middleware
app.use(express.json());
app.use(cors({
    origin : 'https://aabarnawal.github.io/deeplearningWebsiteClient/',
    methods : 'GET, POST,PUT, DELETE',
    credentials : true
}));
app.use(session({
    secret:"tydcukygay8y3834239479182341hu9uojr312093458njb",
    resave: false,
    saveUninitialized : true
}))
app.use(passport.initialize());
app.use(passport.session());


//email
const transporter = nodemailer.createTransport({
    service: "Gmail", 
    auth: {
      user: process.env.email,
      pass: process.env.pass
    }
  });    
  app.post("/api/send", (req, res) => {      
    const mailOptions = {
      from: req.body.from,
      to: req.body.email,
      html: req.body.message
    };      
    transporter.sendMail(mailOptions, (error, info) => {
       if(error){
         return res.status(500).send(error);
       }
       res.status(200).send("Email sent successfully");
    });    });
//


passport.use(
    new authstrategy({
        clientID : clientID,
        clientSecret : clientSecret,
        callbackURL : "/auth/google/callback",
        scope : ["profile", "email"]
    },
    async(accessToken,refreshToken,profile, done) =>{
        try{
            let user = await userDb.findOne({googleId : profile.id});
            nameid = profile.id;
            console.log(nameid);
            if(!user){
               user = new userDb({
                googleId : profile.id,
                displayName : profile.displayName,
                email : profile.emails[0].value,
                image : profile.photos[0].value
               });

               await user.save();
            }
            return done(null, user);
        }catch(err){
            return done(err, null);
        }
    }
    )
)


passport.serializeUser((user, done)=>{
    done(null, user);
})
passport.deserializeUser((user, done)=>{
    done(null, user);
})

// initial google login
app.get("/auth/google",passport.authenticate("google",{scope : ["profile", "email"]}));
app.get("/auth/google/callback",passport.authenticate("google", {
    successRedirect : "https://aabarnawal.github.io/deeplearningWebsiteClient/dash",
    failureRedirect : "https://aabarnawal.github.io/deeplearningWebsiteClient/"
}))

//login
app.get("/login/sucess", (req, res)=>{
    console.log(req.user)       //user data
    if(req.user){
        res.status(200).json({message : "user Login", user : req.user})
    }else{
        res.status(400).json({message : "not authorized"})
    }
})

//logout
app.get('/logout', (req, res, next)=>{
    req.logOut(function(err){
        if(err){return next(err)}
        res.redirect("https://aabarnawal.github.io/deeplearningWebsiteClient/")
    })
})



const videoStorage = multer.diskStorage({
    destination: 'uploads', // Destination to store video 
    filename: (req, file, cb) => {
        cb(null, file.fieldname + nameid + '_' + Date.now() + path.extname(file.originalname))
    }
});

const videoUpload = multer({
    storage: videoStorage,
    limits: {
        fileSize: 10000000 // 10000000 Bytes = 10 MB
    },
    fileFilter(req, file, cb) {
        // upload only mp4 and mkv format
        if (!file.originalname.match(/\.(mp4|MPEG-4|mkv)$/)) {
            return cb(new Error('Please upload a video'))
        }
        cb(null, true)
    }
})

app.post('/uploadVideo', videoUpload.single('video'), async (req, res) => {
    try {
        const filePath = path.resolve(__dirname, './uploads', req.file.filename);
        const fileData = fs.readFileSync(filePath);

        const formData = new FormData();
        formData.append('file', fileData, req.file.originalname);
        console.log(req.file.filename)
        const axiosRes = await axios.post('https://video-cheker.onrender.com/check_video/', formData, {
            headers: {
                ...formData.getHeaders(), // Include the necessary headers for FormData
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('Response:', axiosRes.data.is_video);
        
        console.log('Video uploaded successfully');

        res.status(200).send(axiosRes.data.is_video);
    } catch (error) {
        console.error('Error uploading video:', error.message);
        res.status(500).send('Error uploading video');
    }
});


app.listen(port , ()=>{
    console.log(`your server is running on : `);
    console.log(`http://localhost:${port}`);
})
