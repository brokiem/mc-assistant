const mineflayer = require('mineflayer')
const {Vec3} = require("vec3");

// extensions
const mineflayerViewer = require('prismarine-viewer').mineflayer
const pathfinder = require('mineflayer-pathfinder').pathfinder
const Movements = require('mineflayer-pathfinder').Movements
const {GoalNear} = require('mineflayer-pathfinder').goals
const collectBlock = require('mineflayer-collectblock').plugin
const pvp = require('mineflayer-pvp').plugin

let mcData
let hunt
const bot = mineflayer.createBot({
    host: process.env.address ?? 'localhost',
    port: process.env.port ?? 25565,
    username: 'broki_bot'
})

// load extensions
bot.loadPlugin(pathfinder)
bot.loadPlugin(collectBlock)
bot.loadPlugin(pvp)

let defaultMove

bot.once('spawn', () => {
    mcData = require('minecraft-data')(bot.version)

    defaultMove = new Movements(bot, mcData)
    mineflayerViewer(bot, {firstPerson: true, port: process.env.PORT ?? 443})

    const path = [bot.entity.position.clone()]
    bot.on('move', () => {
        if (path[path.length - 1].distanceTo(bot.entity.position) > 1) {
            path.push(bot.entity.position.clone())
            bot.viewer.drawLine('path', path)
        }
    })

    console.log("Spawned")
})

bot.on('chat', async (username, message) => {
    if (username === bot.username) return

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
                case "stop":
                    hunt = null
                    bot.chat("Stopped hunting")
                    break
                default:
                    bot.chat("Usage: attack <player|entity|stop> <name> <hunt>")
            }

            hunt = null

            if (args[3] === "hunt") {
                hunt = args[2]
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
        case "come":
            if (username !== "brokiemydog") {
                return
            }

            let pos

            if (args.length >= 4) {
                pos = new Vec3(parseFloat(args[1]), parseFloat(args[2]), parseFloat(args[3]))
            } else {
                const target = bot.players[username] ? bot.players[username].entity : null

                if (!target) {
                    bot.chat('I don\'t see you !')
                    return
                }

                pos = target.position
            }

            bot.chat("Otw to " + pos.toString())

            bot.pathfinder.setMovements(defaultMove)
            bot.pathfinder.setGoal(new GoalNear(pos.x, pos.y, pos.z, 1))
            break
    }
})

bot.on("stoppedAttacking", async () => {
    if (hunt === null) return

    await attackEntity(hunt)
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
    await bot.pvp.attack(best)
}