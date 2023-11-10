const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    withdrawalPassword: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    inviteCode: {
        type: String,
        required: true,
        unique: true
    },

    refferedBy: {
      type: mongoose.Schema.Types.ObjectId, // Reference to another user
      ref: 'user', // This should match the model name
    },
    type:{
      type:String,
      default:'User',
    },
    status:{
      type:String,
      default:'active',
    },
    createdAt:String,

    ipAddress:String,

    level:{
      type:Number,
      default:'0',
    },
    creditscore:{
      type:Number,
      default:'0',
    },
    
    account: {
      balance: {
        type: Number,
        default: 10, // Set the default balance to 10
      },
      withdrawnAmount: {
        type: Number,
        default: 0, // Default to 0
      },
      pendingAmount: {
        type: Number,
        default: 0, // Default to 0
      },
    },

    tasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    }],
    claimedTasks: [{
      
    }],
    unclaimedTasks: [{
     
    }],


  });

  module.exports = new mongoose.model('User', userSchema);
  var User=mongoose.model("User",userSchema);

module.exports.User=User;

