const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const mineflayerViewer = require('prismarine-viewer').mineflayer;
const options = require("options");
const readline = require('readline');
const collectBlock = require('mineflayer-collectblock').plugin


const serverHost = 'emerald.magmanode.com';
const serverPort = 26565;
const botUsername = 'fer0_bot';
const botPassword = '1234';

let bot = null;
const adminName = 'AYBORA67TR';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

bot = mineflayer.createBot({
  host: serverHost,
  port: serverPort,
  username: botUsername,
  password: botPassword  
});

bot.on('login', () => {
  console.log('Bot giriş yaptı!');
  bot.chat('/register bot1234 bot1234');
  bot.chat('/login bot1234');
  console.log('Bot kayıt oldu!');
  bot.chat("Sizin için ne yapabilirim bayım?");
});

bot.on('kicked', (reason, loggedIn) => {
  if (loggedIn) {
    console.log('Bot sunucudan atıldı:', reason);
    setTimeout(() => {
      bot.end();
      bot = mineflayer.createBot({
        host: serverHost,
        port: serverPort,
        username: botUsername,
        password: botPassword
      });
    }, 5000);
  }
});

bot.on('error', (err) => {
  console.error('Bot hatası:', err);
});

bot.loadPlugin(pvp);
bot.loadPlugin(armorManager);
bot.loadPlugin(pathfinder);

bot.on('playerCollect', (collector, itemDrop) => {
  if (collector !== bot.entity) return

  setTimeout(() => {
    const sword = bot.inventory.items().find(item => item.name.includes('sword'))
    if (sword) bot.equip(sword, 'hand')
  }, 150)
})

bot.on('playerCollect', (collector, itemDrop) => {
  if (collector !== bot.entity) return

  setTimeout(() => {
    const shield = bot.inventory.items().find(item => item.name.includes('shield'))
    if (shield) bot.equip(shield, 'off-hand')
  }, 250)
})

let guardPos = null

function guardArea (pos) {
  guardPos = pos.clone()

  if (!bot.pvp.target) {
    moveToGuardPos()
  }
}

function stopGuarding () {
  guardPos = null
  bot.pvp.stop()
  bot.pathfinder.setGoal(null)
}

function moveToGuardPos () {
  const mcData = require('minecraft-data')(bot.version)
  bot.pathfinder.setMovements(new Movements(bot, mcData))
  bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z))
}

bot.on('stoppedAttacking', () => {
  if (guardPos) {
    moveToGuardPos()
  }
})

bot.on('physicTick', () => {
  if (bot.pvp.target) return
  if (bot.pathfinder.isMoving()) return

  const entity = bot.nearestEntity()
  if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0))
})

bot.on('physicTick', () => {
  if (!guardPos) return

  const filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16 &&
                      e.mobType !== 'Armor Stand'

  const entity = bot.nearestEntity(filter)
  if (entity) {
    bot.pvp.attack(entity)
  }
})

bot.on('chat', (username, message) => {
  if (message === 'guard' && username === adminName) {
    const player = bot.players[username]

    if (!player) {
      bot.chat("Seni göremiyorum.")
      return
    }

    bot.chat('O yeri koruyacağım.')
    guardArea(player.entity.position)
  }

  if (message === 'fight me' && username === adminName) {
    const player = bot.players[username]

    if (!player) {
      bot.chat("Seni göremiyorum.")
      return
    }

    bot.chat('Dövüşmeye hazırlan!')
      bot.pvp.attack(player.entity)
      }

      if (message === 'stop' && username === adminName) {
        bot.chat('Artık bu bölgeyi korumayacağım.')
        stopGuarding()
      }
    })

    bot.loadPlugin(pvp)
    bot.loadPlugin(pathfinder)

    bot.on('chat', (username, message) => {
      let mess = message.split(" ");
      if (username === adminName) {
        if (mess[0] == 'come' && mess[1] == 'fer0_bot') {
          const mcData = require('minecraft-data')(bot.version);
          const defaultMove = new Movements(bot, mcData);
          bot.pathfinder.setMovements(defaultMove);
          bot.pathfinder.setGoalNear(mess[2], mess[3], mess[4], 1);
        }
        if(mess[0]=='Kill'){
          let enemy=bot.players[mess[1]]
          if(enemy!=null){
            bot.pvp.attack(enemy.entity)
            bot.chat("ölme zamanı 😈!")
          }
        }
        if (message == 'dur') {
          bot.pvp.stop()
        }
      }
    })

    setTimeout(function(){
      bot.loadPlugin(pvp)
      bot.loadPlugin(armorManager)
      bot.loadPlugin(pathfinder)
    })

    bot.once('!spawn', () => {
        setInterval(() => {
            const mobFilter = e => e.type === 'mob' && e.mobType === 'Zombie'
            const mob = bot.nearestEntity(mobFilter)

            if (!mob) return;

            const pos = mob.position;
            bot.lookAt(pos, true, () => {
                bot.attack(mob);
            });
        }, 1000);
    });
    //---------------------------------------------------------------------

    // Botu uyutma ve uyandırma işlemleri
    bot.on('chat',(username,message)=>{
        if(username === bot.username) return

        switch (message){
            case '!uyu':
                goToSleep()
                break
            case '!uyan':
                wakeUp()
                break
            case '!cik':
                bot.quit()
                break
        }
    });

    bot.on('sleep',()=>{
        bot.chat('İyi geceler!')
    });

    bot.on('wake',()=>{
        bot.chat('Günaydın!')
    });

    async function goToSleep() {
        const bed = bot.findBlock({
            matching: block => bot.isABed(block)
        })

        if (bed) {
            try {
                await bot.sleep(bed)
                bot.chat("I am Sleeping.")
            } catch (err) {
            bot.chat(`Uyuyamam: ${err.message}`)
            }
    } else {
    bot.chat('Yakınlarda yatak yok')
    }
    }

    async function  wakeUp() {
        try {
            await bot.wake()
        } catch (err) {
            bot.chat(`Kalkamam: ${err.message}`)
        }
    }
    //---------------------------------------------------------------------

    // Sunucuyu tarayıcıda izleme
    bot.once('spawn',() =>{
        mineflayerViewer(bot,{
            port:3007,
            firstPerson:true,
            viewDistance: "25"})
    })
    //---------------------------------------------------------------------

    // Komutla envanterden öğeleri atma
    bot.on('chat',function (username,message){
        if(username === bot.username) return;
        if (message === "Drop" && username === adminName){
            function tossNext(){
                if(bot.inventory.items().length === 0) {
                    console.log("Envanterim boş :(.")
                } else {
                    const item = bot.inventory.items()[0]
                    bot.tossStack(item,tossNext)
                }
            }
            tossNext()
        }
    });
    //---------------------------------------------------------------------
    // Otomatik tıklama
    bot.on('spawn', function (){
        bot.loadPlugin(require("mineflayer-autoclicker"))
    //    bot.autoclicker.start()  // Bot sunucuya girdiğinde otomatik tıklamayı otomatik başlatma (isteğe bağlı)
    })

    bot.on('chat', function (username, message){
        if(message === "Start click" && username === adminName) {
            bot.autoclicker.start()
        }

        if(message === "Stop click" && username === adminName) {
            bot.autoclicker.stop()
        }
    });
    //---------------------------------------------------------------------

    // Sağlık ve Yemek sayısını hesaplama
    bot.on('chat', function (username,message){
    if(username === bot.username) return;

    if(message === "Health" && username === adminName){
        bot.chat('I have ' + bot.health.toFixed(0) + ' health')
    }
    if(message === "Food" && username === adminName){
        bot.chat(`I have ` + bot.food + ` food`)
    }
    if(message === "Experience" && username === adminName){
        bot.chat("I have " + bot.experience.points.toFixed(0) + " experience" )
      }
      if(message === "Level" && username === adminName){
           bot.chat('I have ' + bot.experience.level.toFixed(0) + ' level')
      }
      });

      // Web-yağma
      const radarPlugin = require('mineflayer-radar')(mineflayer);
      radarPlugin(bot, options);


//Bota sahibinden baska kimse saldiramaz

bot.on('entityHurt', (entity, attacker) => {
  if (attacker.type === 'player' && attacker.username !== adminName) {
    bot.chat(`Hey ${attacker.username}, bana saldırmaya nasıl cesaret edersin? dövüşmeye hazırlan :)!`);
    bot.pvp.attack(attacker);
  }
});
//Collect block
bot.loadPlugin(collectBlock)

let mcData
bot.once('spawn', async () => {
  mcData = require('minecraft-data')(bot.version);
});

bot.loadPlugin(collectBlock);

bot.on('chat', async (username, message) => {
  if (username !== adminName) return; // Sadece adminName dinlesin

  const args = message.split(' ');
  if (args[0] !== 'collect') return;

  let count = 1;
  let type = args[1];

  if (args.length === 3) {
    count = parseInt(args[1]);
    type = args[2];
  }

  const blockType = mcData.blocksByName[type];

  if (!blockType) {
    bot.chat("O blok tipini tanımıyorum.");
    return;
  }

  const blocks = bot.findBlocks({
    matching: blockType.id,
    maxDistance: 666,
    count: count
  });

  if (blocks.length === 0) {
    bot.chat("Yakınlarda o bloğu göremiyorum.");
    return;
  }

  const targets = blocks.slice(0, count).map(pos => bot.blockAt(pos));

  bot.chat(`buldum${targets.length} ${type}(s)`);

  try {
    await bot.collectBlock.collect(targets);
    bot.chat('Toplama Bitti.');
  } catch (err) {
    bot.chat(`Hata Toplama Bloğu: ${err.message}`);
    console.error(err);
  }
});