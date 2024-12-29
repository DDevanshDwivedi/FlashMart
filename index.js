const express = require("express");
const app=express();
const getconnect=require("./dbconnect");
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const email = req.body.email || 'profile';
        const ext = path.extname(file.originalname);
        cb(null, `${email}.png`);
    }
});
const upload = multer({ storage: storage });
app.set("view engine","ejs");
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname+"/public"));
app.use(express.urlencoded({ extended: true }));


app.get("/home", (req,res)=>{
    res.render("home");
});

app.get("/loginPage", (req,res)=>{
    res.render("login");
});
app.post('/loginres',async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let con=await getconnect();
    let collection=await con.collection("userData");
    let r=await collection.find({email:email, password:password}).toArray();
    if (r.length >=1) {
        res.render("searchPage",{email:email});
    } else {
        res.render("login");
    }
});

app.get("/register",(req,res)=>{
    res.render("register");
});
app.get("/forget",async(req,res)=>{
    res.render('forget', { message: null, error: null });
})
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        return res.json({ message: 'Password reset link sent to your email.' });
    } catch (error) {
        return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
    }
});

app.post('/submit_registration', upload.single('profile-photo'), async(req, res) => {
    const { name, email, phone, password, gender, address, userType } = req.body;
    let con = await getconnect();
    let collection = await con.collection("userData");
    let r = await collection.find({ email: email }).toArray();

    if (r.length === 0) {
        let dupdate = await collection.insertOne({
            name: name,
            email: email,
            phone: phone,
            password: password,
            gender: gender,
            address: address,
            userType: userType
        });

        if (dupdate.acknowledged) {
            console.log("Record inserted");
        }
    } else {
        console.log("User already exists");
    }
    const profilePhoto = req.file ? req.file.filename : 'no-file-uploaded';
    res.render('profile', {
        name: name,
        email: email,
        phone: phone,
        gender: gender,
        address: address,
        userType: userType,
        profilePhoto: `/uploads/${email}`
    });
});




app.get('/profile/:email', async (req, res) => {
    try {
        let con = await getconnect();
        let collection = await con.collection("userData");
        let user = await collection.findOne({ email: req.params.email });

        if (user) {
            res.render('profile', {
                name: user.name,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                address: user.address,
                userType: user.userType,
                profilePhoto: `/uploads/${user.email}`
            });
        } else {
            res.status(404).send("User not found");
        }
    } catch (error) {
        console.error("Error fetching profile", error);
        res.status(500).send("Internal server error");
    }
});

// newsletter 
app.use(express.json());
app.post('/subscribe', async (req, res) => {
    const { email } = req.body; 
    console.log(`New subscription: ${email}`);
    let con=await getconnect();
    let collection= con.collection("newsletter");
    let rt=await collection.find({email:email}).toArray();;
    if(rt.length==0)
    {
        r= await collection.insertOne({email});
        console.log(r);
    }
    res.status(200).json({ message: 'Successfully subscribed to the newsletter!' });
});
app.get('/cart', (req, res) => {
    res.render("cart");
});

app.get("/contactFrom", async(req,res)=>{
    res.render("contactFrom");
});

app.post('/submit_contact', async (req, res) => {
    const { name, email, phone, address, reason, subject, message } = req.body;
    let con = await getconnect();
    let collection = await con.collection("contactData");
    let r = await collection.find({ email: email }).toArray();

    if (r.length <= 10) {
        let dupdate = await collection.insertOne({
            name: name, 
            email: email, 
            phone: phone, 
            address: address, 
            reason: reason, 
            subject: subject, 
            message: message
        });
        if (dupdate.acknowledged === true) {
            console.log("Contact record inserted");
        }
    }
    res.render('contact_confirmation', {
        name: name,
        email: email,
        phone: phone,
        address: address,
        reason: reason,
        subject: subject,
        message: message,
    });
});

app.get('/search', async (req, res) => {
    res.render("searchPagewithout");
});

const { v4: uuidv4 } = require('uuid'); 

app.post("/api/addItem", async (req, res) => {
    const { name, category, price } = req.body;
    const itemId = uuidv4().slice(0, 4);
    let con = await getconnect();
    let collection = con.collection("ProductList");
    
    try {
        await collection.insertOne({ 
            itemId,name,category,price });
        res.json({ message: "Item added successfully!", itemId });
    } catch (err) {
        res.status(500).json({ message: "Error adding item." });
    }
});


app.delete("/api/deleteItem", async (req, res) => {
    const { itemId } = req.body; 
    let con = await getconnect();
    let collection = con.collection("ProductList");

    try {
        const result = await collection.deleteOne({ itemId: itemId });
        
        if (result.deletedCount > 0) {
            res.json({ message: "Item deleted successfully!" });
        } else {
            res.json({ message: "Item not found." });
        }
    } catch (err) {
        res.status(500).json({ message: "Error deleting item." });
    }
});

app.get("/api/showItems", async (req, res) => {
    let con = await getconnect();
    let collection = con.collection("ProductList");

    try {
        const items = await collection.find({}).toArray();
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: "Error fetching items." });
    }
});

app.get("/profileAccount/:email", async(req, res) => {
    let con = await getconnect();
    let collection = await con.collection("userData");
    let user = await collection.findOne({ email: req.params.email });
    let purchaseCollection = con.collection("Purchases");
    let purchases = await purchaseCollection.find({ customerId: req.params.email }).toArray();
    if (user) {
        const isCustomer = user.userType === "customer"; 
        res.render(isCustomer ? "acountC" : "acountA", {
            name: user.name,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            address: user.address,
            userType: user.userType,
            purchases: purchases,
            profilePhoto: `/uploads/${user.email}`
        });
    } else {
        res.status(404).send("User not found");
    }
});
app.post('/api/makePayment', async (req, res) => {
    const { selectedItems, userId, totalAmount } = req.body;
    
    try {
        const purchase = {
            userId: userId,
            purchaseDate: new Date(),
            items: selectedItems,  
            totalAmount: totalAmount,
        };

        await Purchase.create(purchase);  
        for (const itemId of selectedItems) {
            await Item.findByIdAndUpdate(itemId, { status: 'purchased' });
        }

        res.status(200).send({ message: "Payment successful, purchase updated." });
    } catch (error) {
        res.status(500).send({ error: "Failed to update purchase." });
    }
});
app.get("/api/searchItems", async (req, res) => {
    let con = await getconnect();
    let collection = con.collection("ProductList");

    try {
        const searchQuery = req.query.query || '';
        const items = await collection.find({ name: searchQuery }).toArray();
        res.json(items.length ? items : { message: "No items found." });
    } catch (err) {
        res.status(500).json({ message: "Error fetching items." });
    }
});


let port =8000;
app.listen(port,()=>console.log(`Server is running on ${port}`));