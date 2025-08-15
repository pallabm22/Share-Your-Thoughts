const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/register", async (req, res) => {
  let { name, username, age, email, password } = req.body;
  const user = await userModel.findOne({ email });

  if (user) {
    return res.status(500).send("User is already registered");
  }

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      const CreatedUser = await userModel.create({
        name,
        username,
        age,
        email,
        password: hash,
      });
      const token = jwt.sign(
        { email: email, userid: CreatedUser._id },
        "SShhhhhhh"
      );
      res.cookie("token", token);
      res.send("Registered");
    });
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  const user = await userModel.findOne({ email });

  if (!user) {
    return res.status(500).send("User not Registered");
  }
  bcrypt.compare(password, user.password, (err, result) => {
    if (result) {
      const token = jwt.sign({ email: email, userid: user._id }, "SShhhhhhh");
      res.cookie("token", token);
      return res.status(200).redirect("/profile");
    } else {
      res.send("Something went wrong");
    }
  });
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
  const post = await postModel.findById(req.params.id).populate("user");
  
  if (!post) {
    return res.status(404).send("Post not found");
  }

  if (post.likes.indexOf(req.user.userid) == -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }
  await post.save();
  res.redirect("/profile");
});


app.get("/edit/:id", isLoggedIn, async (req, res) => {
  const post = await postModel.findById(req.params.id).populate("user");
  res.render("edit",{post})
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
  const post = await postModel.findOneAndUpdate({_id:req.params.id},{content:req.body.content}).populate("user");
  res.redirect('/profile');
});



app.get("/profile", isLoggedIn, async (req, res) => {
  const user = await userModel
    .findOne({ email: req.user.email })
    .populate("posts");
  res.render("profile", { user: user });
});

app.post("/createpost", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({ email: req.user.email });
  const { content } = req.body;
  const post = await postModel.create({
    user: user._id,
    content: content,
  });
  user.posts.push(post._id);
  user.save();
  res.redirect("/profile");
});

function isLoggedIn(req, res, next) {
  try {
    const token = req.cookies.token;
    if (!token) res.redirect("/login");
    const data = jwt.verify(req.cookies.token, "SShhhhhhh");
    req.user = data;
    next();
  } catch (error) {
    return res.send("No cookies");
  }
}

app.listen(3000, (err) => {
  console.log("App is running on port 3000");
});
