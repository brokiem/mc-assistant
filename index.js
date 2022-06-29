const mineflayer = require('mineflayer')

// extensions
const mineflayerViewer = require('prismarine-viewer').mineflayer
const pathfinder = require('mineflayer-pathfinder').pathfinder
const collectBlock = require('mineflayer-collectblock').plugin
const pvp = require('mineflayer-pvp').plugin

let mcData
const bot = mineflayer.createBot({
    host: 'localhost',
    port: 25565,
    username: 'broki_bot'
})

// load extensions
bot.loadPlugin(pathfinder)
bot.loadPlugin(collectBlock)
bot.loadPlugin(pvp)

bot.once('spawn', () => {
    mcData = require('minecraft-data')(bot.version)

    //mineflayerViewer(bot, { firstPerson: true, port: 3000 })

    /* const path = [bot.entity.position.clone()]
     bot.on('move', () => {
         if (path[path.length - 1].distanceTo(bot.entity.position) > 1) {
             path.push(bot.entity.position.clone())
             bot.viewer.drawLine('path', path)
         }
     })*/

    console.log("Spawned")
})

bot.on('chat', async (username, message) => {
    const args = message.split(' ')

    switch (args[0]) {
        case "attack":
            switch (args[1]) {
                case "player":
                case "p":
                    await attackPlayer(args[2])
                    break
                case "entity":
                case "e":
                    await attackEntity(args[2])
                    break
                default:
                    bot.chat("Usage: attack <player|entity> <name>")
            }
            break
        case "collect":
            if (args[1] === "stop") {
                bot.chat("Stopped collecting")
                args[1] = "air"
            }

            const blockType = mcData.blocksByName[args[1] === "vein" ? args[2] : args[1]]
            if (!blockType) {
                bot.chat("I don't know any blocks with that name.")
                return
            }

            bot.chat('Collecting the nearest ' + blockType.name)

            // Try and find that block type in the world
            let block = bot.findBlock({
                matching: blockType.id,
                maxDistance: 128
            })

            if (!block) {
                bot.chat("I don't see that block nearby.")
                return
            }

            // Collect the block
            if (args[1] === "vein") {
                block = bot.collectBlock.findFromVein(block)
            }

            try {
                await bot.collectBlock.collect(block)
                bot.chat('Done')
            } catch (err) {
                console.log(err)
                bot.chat(err.message)
            }
            break
    }
})

async function attackPlayer(username) {
    const player = bot.players[username]
    if (!player || !player.entity) {
        bot.chat('I can\'t see ' + username)
    } else {
        bot.chat(`Attacking ${player.username}`)
        await bot.pvp.attack(player.entity)
    }
}

async function attackEntity(name) {
    let best = null
    let bestDistance = Number.MAX_VALUE

    for (const entity of Object.values(bot.entities)) {
        if (entity === bot.entity || entity.name !== name) {
            continue
        }

        const dist = bot.entity.position.distanceSquared(entity.position)
        if (dist < bestDistance) {
            best = entity
            bestDistance = dist
        }
    }

    if (!best) {
        bot.chat("Could't find entity " + name)
        return
    }

    bot.chat(`Attacking ${best.name}`)
    pullSword()
    await bot.pvp.attack(best)
}

async function pullSword() {
    const sword = bot.inventory.items().find(item => item.name.includes('sword'))
    if (sword) {
        bot.equip(sword, 'hand')
    }
}
