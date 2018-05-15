module.exports = function(controller) {
  var MongoClient = require("mongodb").MongoClient;

  var original_text;
  var reason;
  var amount;
  var from_name;
  var from_id;
  controller.on("slash_command", function(bot, message) {
    bot.replyAcknowledge();
    from_id = message.user_id;
    from_name = message.user_name;
    var infos = message.text.split(" ");
    var to = infos[0].split("|")[0].replace("<@", "");
    var to_name = infos[0].split("|")[1].replace(">", "");
    amount = parseInt(infos[1]);
    reason = infos[2];
    var text = "*@" + from_name + "* cooked *" + amount + "* banquet for you";
    original_text = text;
    var remainingBanquet = getRemainingBanquet(from_id, from_name,function(remaining){
      return remaining;
    });
    console.log("here", remainingBanquet);
    if (from_id == to) {
      bot.sendEphemeral({
        channel: message.channel_id,
        user: to,
        text: "Sorry, you can't cook a banquet to yourself"
      });
    // } else if (amount > 6) {
    //   console.log("amount over");
    //   console.log(remainingBanquet);
    //   replyWith(bot,message.channel_id,to,"Sorry, the amount given is over the gift limit");
    //   // bot.api.chat.postEphemeral({
    //   //   channel: message.channel_id,
    //   //   user: to,
    //   //   text: "Sorry, the amount given is over the gift limit"
    //   // });
    //   console.log("amount over")
    // } else if (amount > remainingBanquet && amount <= 6) {
    //   // bot.sendEphemeral({
    //   //   channel: message.channel_id,
    //   //   user: to,
    //   //   text: "Sorry, you have " + remainingBanquet + " left"
    //   // });
    } else {
      handleCooking(from_id, from_name, to, to_name, amount, bot);
      bot.sendEphemeral({
        channel: to,
        user: to,
        text: text,
        attachments: [
          {
            text: reason,
            callback_id: "123",
            attachment_type: "default",
            actions: [
              {
                name: "yes",
                text: ":thumbsup:",
                value: ":thumbsup:",
                type: "button"
              },
              {
                name: "no",
                text: ":joy:",
                value: ":joy:",
                type: "button"
              },
              {
                name: "no",
                text: ":msemen:",
                value: ":msemen:",
                type: "button"
              }
            ]
          }
        ]
      });
    }
  });

  controller.on("interactive_message_callback", function(bot, message) {
    var text = "you reacted with " + message.actions[0].value;
    // check message.actions and message.callback_id to see what action to take...
    console.log(text)
    bot.replyInteractive(message, {
      text: original_text,
      attachments: [
        {
          text: reason
        },
        {
          text: text
        }
      ]
    });
  });

  function handleCooking(from_id, from_name, to_id, to_name, amount, bot) {
    controller.storage.users.get(from_id, function(err, user_from) {
      if (!user_from) {
        user_from = {};
        user_from.id = from_id;
        user_from.name = from_name;
        user_from.own = 6;
        // user_from.received = 0;
        user_from.tasks = [];
      }
      user_from.own = user_from.own - amount;
      saveUser(bot, user_from);
      //   controller.storage.users.get(to_id, function(err, user_to) {
      //     if (!user_to) {
      //       user_to = {};
      //       user_to.id = to_id;
      //       user_to.name = to_name;
      //       user_to.own = 6;
      //       user_to.received = 0;
      //       user_to.tasks = [];
      //     }

      //     user_to.received += amount;
      //     saveUser(bot, user_to);
      //   });
      var banquet = {
        from: from_id,
        to: to_id,
        amount: amount,
        date: new Date()
      };
      saveBanquet(bot, banquet);
    });
  }

  function getRemainingBanquet(user_id, user_name,cb) {
    MongoClient.connect(process.env.MONGO_URI, function(err, db) {
      if (err) throw err;
      var dbase = db.db(process.env.MONGODB_DATABASE);
      var query = { id: user_id };
      dbase.collection("users").findOne(query, function(err, user) {
        if (!user) {
          user = {};
          user.id = user_id;
          user.name = user_name;
          user.own = 6;
          user.tasks = [];
          dbase.collection("users").insertOne(user);
        }
        cb(user.own)        
        db.close();
      });
    });
  }

  function saveUser(bot, user) {
    controller.storage.users.save(user, function(err, saved) {
      if (err) {
        bot.replyPrivate(
          message,
          "I experienced an error adding a user: " + err
        );
      }
    });
  }

  function saveBanquet(bot, banquet) {
    MongoClient.connect(process.env.MONGO_URI, function(err, db) {
      if (err) throw err;
      var dbase = db.db(process.env.MONGODB_DATABASE);
      dbase.collection("banquet").insertOne(banquet, function(err, user) {
        if (err) {
          bot.replyPrivate(
            message,
            "I experienced an error handling your banquet: " + err
          );
        }
        db.close();
      });
    });
  }

  function replyWith(bot,channel,user,text){
    bot.sendEphemeral({
      channel: channel,
      user: user,
      text: text
    });
  }
};
