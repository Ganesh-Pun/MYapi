
const express = require("express");
const {Pool} = require("pg")
const app = express();
const bodyParser = require("body-parser");
const port = 8001;
const fs = require("fs");
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.use(bodyParser.json())

const pool = new Pool(
    
    {
        user:'postgres',
        host:'localhost',
        password:'ganeshPostgres@Learn',
        port:5432,
        database:'postgres'
    }
);


// ************************************************     SignUp API for storing user info     ************************************************************************

app.post("/api/forProfile",async(req,res)=>{

    const {userId} = req.body;
    const {rows} = await pool.query("SELECT * FROM userTable");
    const profile = rows.find((user)=>user.email === userId);
    // console.log(profile);
    const imag = profile['image'];
    // console.log("image: "+imag);
    const image = fs.readFileSync(`E:/Ganesh Pun/Android_project/ExploreLearn APP/Images/${imag}`);
    const img = image.toString('base64');

    // console.log(img);
    res.send({
        "profile":profile,
        "image":img
    })
})


app.post("/api/signUp",(req,res)=>{
    const value = req.body.image || "DEFAULT.png"
    const {email,username,phone,gender,password,signUp_date,image,dob,education,referral_code} = req.body;
    const sql = 'INSERT INTO userTable(email, username, phone, gender, password, signUp_date, image, dob, education, referral_code,firstLogin) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)';
    pool.query(sql, [email, username, phone, gender, password, new Date(), value, dob, education, referral_code,false], (err,result)=>{
        if(err){
            console.log("error: "+err.message);
            res.send("insertion failed")
        }else{
        res.send("inserted successfully")
        }
    });
})


// ************************************************     Rewards API for storing rewards     ************************************************************************

app.get("/api/rewards",(req,res)=>{
    const sql = 'SELECT * FROM rewards';
    const rows = pool.query(sql).rows;
    res.send(rows)
})

app.post("/api/rewards",(req,res)=>{
    const bodyLength = req.body.length;

    const { user_id } = req.body; 
    if (user_id && Object.keys(req.body).length === 1) {

    const quy = "SELECT * FROM rewards WHERE user_id = $1";
    pool.query(quy,[user_id],(er,result)=>{
        if(er){
            console.log(er.message);
        }else{

            calculateTotalPoints(user_id).then(total=>{
                console.log("total: "+total);
                res.send({
                    "history":result.rows,
                    "total":total
                })
            });
        }
    })
}

function calculateTotalPoints(user) {
  return new Promise((resolve, reject) => {
    const query = "SELECT get_total_reward_points($1)";
    pool.query(query, [user], (err, result) => {
      if (err) {
        reject(err);
      } else {
        const total = result.rows[0].get_total_reward_points;
        console.log(total);
        resolve(total);
      }
    });
  });
}
    
console.log(bodyLength);

    if((bodyLength == undefined) && (Object.keys(req.body).length != 1) ){
        let {user_id,title,reward_points,total_points,entryDate} = req.body;
        const sq = 'INSERT INTO rewards(user_id,title,reward_points,entryDate) VALUES($1, $2, $3, $4)';
        pool.query(sq,[user_id,title,reward_points,new Date()],(er,result)=>{
            if(er){
                console.log("error single: "+er.message);
            }else{
                    res.send("inserted done");  
            }    
        })
    }else{

        let count=0;
        for(let i=0; i<bodyLength;i++){
            let temp = req.body[i];
            const sql = 'INSERT INTO rewards(user_id,title,reward_points,entryDate) VALUES ($1, $2, $3, $4)';
            pool.query(sql,[temp.user_id,temp.title,temp.reward_points,new Date()],(er,result)=>{
                if(er){
                    console.log("error: "+er.message);
                }else{
                    count++;
                    if(count === bodyLength){
                        res.send("inserted successfully");
                    }
                }
            });
        }
    }
});


// ************************************************     Referral API for checking referral code with existed referral code in signUp table     ***********************


app.post("/api/referral_check",(req,res)=>{
    const {referral_code} = req.body;
    const sql = 'SELECT * FROM userTable WHERE referral_code = $1'
    pool.query(sql,[referral_code],(er,result)=>{
        if(er){
            console.log("error refferal error");
            
            res.send("error refferal error")
        }else{

            const rows = result.rows;
            const referral_codes = rows.map(row => row.referral_code);
            const email = rows.map(r=> r.email);

            if(referral_codes.includes(referral_code)){
                res.send(email[0]);
            }else{
                res.send("NotMatch");
            }


            
            console.log("query done referral");
        }

    
    })
})


// ************************************************     Login API     ***********************


app.post("/api/login",(req,res)=>{
    const {email,password,firstLogin} = req.body;
    const sql = 'SELECT * FROM userTable WHERE email = $1'
    pool.query(sql,[email],(er,result)=>{

        if(er){
            console.log("Login error");
            
            res.send("error login error")
        }else{
            console.log("result: "+result);
            // console.log(result);

            if(result.rowCount != 0){
                const rows = result.rows;
                if (rows.length > 0) {
                const userEmail = rows.map(row => row.email);
                const userPassword = rows.map(row => row.password);
                const lg = rows.map(row => row.firstlogin);
                console.log("YOur lg: "+lg);
                console.log("YOur userEmail: "+userEmail);
                console.log("YOur userPassword: "+userPassword);
                const q = 'UPDATE userTable set firstlogin= $1 WHERE email= $2';
                pool.query(q,[firstLogin,email])
            
                if(userEmail.includes(email) && (userPassword.includes(password))){
                    res.send({
                        "login":"true",
                        "flag":lg[0]
                    });
                }else{
                    res.send({
                        "login":"false"
                    });
                }
            
                
                console.log("query done login");
                }
            }else{
                res.send({
                   "login": "NoData"
                });
            } 
        }
    })
});



// ************************************************    Profile Upadate API for updating user's profile     *************************************************



app.post("/api/profle_update", (req, res) => {
    const { username, phone, password, image, dob, education, email } = req.body;

    // Checking if the image property is present in the req.body object
    let imageName;
    if (!image) {
      // If it is not present, use the default image file name
      imageName = "DEFAULT.png";
    } else {
      // If the image property is present, save the image data to a file
      const decodedBuffer = Buffer.from(image, "base64");
      imageName = `image_${phone}.png`;
      const imagePath = `E:\\Ganesh Pun\\Android_project\\ExploreLearn APP\\Images\\${imageName}`;

      fs.writeFile(imagePath, decodedBuffer, (err) => {
        if (err) {
          console.error("error while saving Pic " + err);
          return;
        } else {
          console.log("Image saved successfully: " + imageName);
        }
      });
    }

    // Update the user's profile with the provided data and the image file name
    const sql = "UPDATE userTable SET username=$1, phone=$2, password=$3, image=$4, dob=$5, education=$6 WHERE email=$7";
    pool.query(sql, [username, phone, password, imageName, dob, education, email], (err, result) => {
      if (err) {
        console.log("error profle_update error", err);
        res.send("error profle_update error");
      } else {
        res.send("Update successful");
      }
    });
});











app.listen(port,(e)=>{
    console.log(`server is running at ${port}`);
})


