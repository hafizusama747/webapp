var express = require('express');
var router = express.Router();
const { User } = require('../models/user');
const { Task } = require('../models/task');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const moment = require('moment-timezone');
const schedule = require('node-schedule');
const checkAuth = require("../middlewares/checkAuth");
const isAdmin = require("../middlewares/isAdmin");
const AsyncLock = require('async-lock');
const lock = new AsyncLock();

const baseURL = process.env.BASE_URL || ''; // Default to an empty string if BASE_URL is not defined
const routePath = `${baseURL}/`;
router.use(routePath, router);

router.get('/profile',checkAuth, async (req, res, next) => {
  const vipLevels = [
    { level: 1, badge: '/images/badges/lvl1.png' },
    { level: 2, badge: '/images/badges/lvl2.png' },
    { level: 3, badge: '/images/badges/lvl3.png' },
    { level: 4, badge: '/images/badges/lvl 4.png' }, 
    { level: 5, badge: '/images/badges/lvl 5.png' },
    { level: 6, badge: '/images/badges/lvl6.png' }
    // Add more levels and badge images as needed
  ];


  // Access the user from the session
  const user = await User.findById(req.session.user._id);

  if (user) {
    // Find the user's VIP level
    const userVIPLevel = user.level; // Change this to your user's VIP level property

    // Logging for debugging
   // console.log('User VIP Level:', userVIPLevel);

    // Find the corresponding badge for the user's VIP level
    const userVIPBadge = vipLevels.find(level => level.level === userVIPLevel);

    // Logging for debugging
    //console.log('User VIP Badge:', userVIPBadge);

    res.render('users/profile', { user,  userVIPBadge });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

router.get('/profile/settings',checkAuth, async(req, res, nxet) => {
  res.render('users/profileSettings')
});

router.post('/profile/settings/changepassword',checkAuth, async (req, res, next) => {
  const userId = req.session.user._id; // Get the user's ID from the session

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the old password matches the user's current password
    const passwordMatch = await bcrypt.compare(req.body.oldloginpassword, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(req.body.newloginpassword, 10);

    // Update the user's password
    user.password = hashedNewPassword;

    // Save the updated user to the database
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error changing password' });
  }
});


router.post('/profile/settings/changewithdrawalpassword',checkAuth, async (req, res, next) => {
  const userId = req.session.user._id; // Get the user's ID from the session

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the old password matches the user's current password
    const passwordMatch = await bcrypt.compare(req.body.oldwithdrawalpassword, user.withdrawalPassword);

    if (!passwordMatch) {
      return res.status(400).json({ message: 'Old withdrawal password is incorrect' });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(req.body.newwithdrawalpassword, 10);

    // Update the user's password
    user.withdrawalPassword = hashedNewPassword;

    // Save the updated user to the database
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error changing password' });
  }
});

//admin panel things start from here
router.get('/admin/dashboard',isAdmin,checkAuth, async function(req, res, next) {
  try {
    const users = await User.find();
    const user = await User.findById(req.session.user._id);

    const totalUsers = users.length;
    
    const activeUsers = users.filter(user => user.status === 'active').length;
    const inactiveUsers = users.filter(user => user.status === 'inactive').length;
    const blockedUsers = users.filter(user => user.status === 'blocked').length;
    
    const activePercentage = (activeUsers / totalUsers) * 100;
    const inactivePercentage = (inactiveUsers / totalUsers) * 100;
    const blockedPercentage = (blockedUsers / totalUsers) * 100;

    // Sort the users by their creation date in descending order
    users.sort((a, b) => b.createdAt - a.createdAt);

    // Extract the newest users into separate variables
    const newestUser1 = users[0];
    const newestUser2 = users[1];
    const newestUser3 = users[2];

    res.render('admin/dashboard', {
      users,user,
      activePercentage,
      inactivePercentage,
      blockedPercentage,
      newestUser1,
      newestUser2,
      newestUser3,
      activeUsers,
      inactiveUsers,
      blockedUsers
    });
  } catch (err) {
    next(err);
  }
});

// Function to fetch users and calculate pagination details
const fetchUsers = async (page, usersPerPage) => {
  const users = await User.find();
  const startIndex = (page - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const totalUsers = users.length;
  const usersToDisplay = users.slice(startIndex, endIndex);
  return { usersToDisplay, totalUsers };
};

// Route to handle the initial page and user listing


// Route to handle paginated requests
router.get('/admin/users/page/:number',isAdmin,checkAuth, async function(req, res, next) {
  const page = parseInt(req.params.number) || 1; // Get the current page from the URL parameters or default to 1
  const limit = 14; // Number of posts per page

  try {
    let users;
    users = await User.find()
    .skip((page - 1) * limit)
    .limit(limit);
    totalUsers = (await User.find()).length;

    const totalPages = Math.ceil(totalUsers / limit);
    const user = await User.findById(req.session.user._id);

    res.render('admin/users', {
      users,
      user,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to handle paginated requests
router.get('/edit/:id',isAdmin,checkAuth, async function(req, res, next) {
 
  try {
    const user =await User.findById(req.params.id)
    //console.log(user)

    res.render('admin/edituser',{user})
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/edit/balance/:id',isAdmin,checkAuth, async function(req, res, next) {
 
  try {
    const user = await User.findById(req.params.id)
    user.account.balance = req.body.newbalance;

    await user.save();
    res.render('admin/edituser',{user})
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/edit/creditscore/:id',isAdmin,checkAuth, async function(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    
    // Ensure the new credit score is within the valid range [0, 100]
    const newCreditScore = parseInt(req.body.newcreditscore);
    
    if (isNaN(newCreditScore) || newCreditScore < 0 || newCreditScore > 100) {
      return res.status(400).json({ error: 'Invalid credit score. Please provide a value between 0 and 100.' });
    }

    user.creditscore = newCreditScore;

    await user.save();
    res.render('admin/edituser', { user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/edit/withdrawnamount/:id',isAdmin,checkAuth, async function(req, res, next) {
 
  try {
    const user = await User.findById(req.params.id)
    user.account.withdrawnAmount= req.body.newwithdrawnamount;

    await user.save();
    res.render('admin/edituser',{user})
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/delete/:id',isAdmin,checkAuth, async function(req, res, next) {
  try {
    const user = await User.deleteOne({ _id: req.params.id });
    if (user.deletedCount === 1) {
      // User was deleted successfully
      res.redirect('/users/admin/users/page/1');
    } else {
      // User with the specified ID was not found
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status/deactivate/:id',isAdmin,checkAuth, async function(req, res, next) {
 
  try {
    const user = await User.findById(req.params.id)
    user.status="inactive"
    await user.save();
    res.render('admin/edituser',{user})
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status/activate/:id',isAdmin,checkAuth, async function(req, res, next) {
 
  try {
    const user = await User.findById(req.params.id)
    user.status="active"
    await user.save();
    res.render('admin/edituser',{user})
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/status/block/:id',isAdmin,checkAuth, async function(req, res, next) {
 
  try {
    const user = await User.findById(req.params.id)
    user.status="blocked"
    await user.save();
    res.render('admin/edituser',{user})
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/level/up/:id',isAdmin,checkAuth, async function (req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    
    if (user.level !== undefined) {
      // Convert the user's level from a string to an integer
      user.level = parseInt(user.level, 10);

      if (user.level < 6) {
        // Increase the user's level by 1
        user.level = user.level + 1;
        await user.save();
      }
    }
    
    res.render('admin/edituser', { user });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/level/down/:id',isAdmin,checkAuth, async function (req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    
    if (user.level !== undefined) {
      // Convert the user's level from a string to a number
      user.level = parseInt(user.level, 10);
      // Decrease the user's level by 1, but ensure it doesn't go below 0
      user.level = Math.max(0, user.level - 1);
      await user.save();
    }
    
    res.render('admin/edituser', { user });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

////////////////////////////////////



async function generateTasksForUsers() {
  await lock.acquire('generateTasksForUsers', async function () {
    try {
      const users = await User.find();
      console.log(`Total users: ${users.length}`);

      for (const user of users) {
        console.log(`Generating tasks for user: ${user._id}`);


        const maxTasks = getMaxTasksForUser(user.level);
        const userTasks = user.tasks || [];
        const tasksToGenerate = Math.min(3, maxTasks - userTasks.length);

        for (let i = 0; i < tasksToGenerate; i++) {

          const count = user.tasks.length;
          console.log("Task number"+count)
          const task = new Task({
            title: count + 1,
            level: user.level,
            user: user,
            expiresAt: calculateExpirationTime(),
          });

          await task.save();
          user.tasks.push(task._id);
        }

        await user.save();
        console.log(`Tasks generated for user: ${user._id}`);
      }
    } catch (error) {
      console.error('Error in generateTasksForUsers:', error);
    }
  });
}


function getMaxTasksForUser(level) {
  // Define the maximum tasks per VIP level
  const maxTasksByLevel = {
      1: 30,
      2: 35,
      3: 40,
      4: 45,
      5: 55,
      6: 65,
  };

  return maxTasksByLevel[level] || 0;
}




function calculateExpirationTime() {
  const currentTime = moment.tz('America/New_York'); // Set the appropriate timezone
  return currentTime.add(1, 'minutes').toDate();
}


// Schedule the job to run every 1 minute
// Define the start time (10:15 PM) for task generation
const taskGenerationStartTime = new Date();
taskGenerationStartTime.setHours(0, 18, 0, 0); // 10:15 PM in Pakistani time

// Define the start time (10:14 PM) for clearing tasks
//const clearTasksStartTime = new Date();
//clearTasksStartTime.setHours(1, 25, 0, 0); // 10:14 PM in Pakistani time

// Schedule the job for task generation to run every 1 minute at 10:15 PM
const dailyTaskGeneration = schedule.scheduleJob('*/1 * * * *', function () {
  console.log('Scheduled task generation started.');
  generateTasksForUsers();
});

// Schedule the job for clearing tasks to run once daily at 10:14 PM
const clearTasks = schedule.scheduleJob({ hour: 6, minute: 07, tz: 'Asia/Karachi' }, function () {
  console.log("Scheduled job started at", new Date());
  clearAllTasks();
  console.log("Scheduled job completed at", new Date());
});

// Function to clear all tasks from the database and the user model once daily
async function clearAllTasks() {
  try {
      // Clear tasks from the database
      await Task.deleteMany({});

      // Clear tasks from the user model
      const users = await User.find();
      for (const user of users) {
          user.tasks = []; // Clear the tasks array
          user.claimedTasks = []; // Clear the tasks array

          user.unclaimedTasks = []; // Clear the tasks array

          await user.save();
      }

      console.log('All tasks cleared from the database and user model.');
  } catch (err) {
      console.error('Error clearing tasks:', err);
  }
}




function isTaskClaimable(task) {
  const currentTime = new Date();
  return currentTime <= task.expiresAt;
}


// async function handleExpiredTasks() {
//   const currentTime = new Date();
//   const expiredTasks = await Task.find({
//     claimedAt: null,
//     expiresAt: { $lte: currentTime },
//     'user': req.session.user._id, // Replace 'userId' with the actual user ID you want to match
//   });
  

//   for (const task of expiredTasks) {
//     // Move the task to the user's task history or delete it, as needed
//     // Update user's balance, etc.
//     let userId = task.user;
//     console.log(userId)

//     let user = await User.findById(userId);

//     user.unclaimedTasks.push(task);

//     await user.save();
//   }
// }


// const expirationCheck = schedule.scheduleJob('*/1 * * * *', function () {
//   handleExpiredTasks();
// });

async function claimTask(user, taskId) {
  const task = await Task.findById(taskId);

  if (!task || task.claimedBy) {
    // Task doesn't exist or is already claimed
    return false;
  }

    
  if (isTaskClaimable(task)) {
    const user1=await User.findById(user._id)
    task.claimedBy = user._id;
    task.claimedAt = new Date();
    await task.save();
    user1.claimedTasks.push(task);
    user1.account.balance = user1.account.balance + 0.8;

    await user1.save();

    //console.log("task claimed")
    // Handle the user's balance and other logic as needed
    // Subtract task rewards, etc.
    
    return true;
  }

  return false;
}
// Sample route to claim a task
router.get('/claim-task/:id',checkAuth, async (req, res) => {
  const taskId = req.params.id;
  const user = req.session.user; // Assuming you have user authentication
  const claimed = await claimTask(user, taskId);

  if (claimed) {
    //res.status(200).json({ message: 'Task claimed successfully.' });
    res.redirect("/users/tasks")
  } else {
    res.status(400).json({ message: 'Task is no longer claimable.' });
  }
});


///////////////////////////////////
router.get('/tasks',checkAuth, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const currentDate = new Date();

    const tasks = await Task.find({
      claimedBy: null, // Not yet claimed
      expiresAt: { $gt: currentDate }, // Not yet expired
      user: userId, // Match tasks for a specific user
    });

    res.render("tasks", { tasks });
  } catch (err) {
    console.error(err);
    // Handle the error appropriately, e.g., by rendering an error page or sending an error response.
  }
});

router.get('/claimedtasks',checkAuth, async (req, res) => {

  // Get the user ID from the request
  const userId = req.session.user._id;
  const user = await User.findById(userId)
  let claimedTasks =  user.claimedTasks;
  // Get the user's tasks
  //const tasks = await Task.find({ userId });
  res.render("claimedtasks",{claimedTasks})

 // res.json(await user.claimedTasks);
});


router.get('/unclaimedtasks',checkAuth, async (req, res) => {

  const userId = req.session.user._id;
  

  const currentTime = new Date();
  const expiredTasks = await Task.find({
    claimedAt: null,
    expiresAt: { $lte: currentTime },
    'user': req.session.user._id, 
  });
  
  res.render("unclaimedtasks",{expiredTasks})
  //res.json(expiredTasks);
});
module.exports = router;
