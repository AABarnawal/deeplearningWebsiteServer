const mongoose = require("mongoose");


mongoose.connect(process.env.DB,{
    useUnifiedTopology:true,
    useNewUrlParser:true
}).then(()=>console.log("database connected")).catch((err)=>console.log("errr",err))