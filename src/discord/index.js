const { Client, Intents } = require("discord.js");
const fs = require("fs");
const dotenv = require("dotenv");


dotenv.config();

const startBot = async () => {
    const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

    client.once("ready", () => {
     console.log('\x1b[33m%s\x1b[0m',"Bot is up");

        const commands = client.application.commands;

        fs.readdirSync("./discord/commands").forEach((fileName) => {
            const command = require(`./commands/${fileName}`);
            commands.create(command.commandInfo);
        });
    });

    client.on("interactionCreate", (interaction) => {
        if (!interaction.isApplicationCommand()) return;

        const commandPath = `./discord/commands/${interaction.commandName}.js`;
        if (fs.existsSync(commandPath)) {
            require(commandPath).execute(interaction);
        }
    });

    await client.login(process.env.DISCORD_BOT_TOKEN);
};

startBot();
