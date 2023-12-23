const { MessageEmbed } = require("discord.js");
const functions = require("../../src/structs/functions.js");

module.exports = {
    commandInfo: {
        name: "create",
        description: "Creates an account on AgencyBackend.",
        options: [
            {
                name: "email",
                description: "Your email.",
                required: true,
                type: 3 // string
            },
            {
                name: "username",
                description: "Your username.",
                required: true,
                type: 3
            },
            {
                name: "password",
                description: "Your password.",
                required: true,
                type: 3
            }
        ],
    },
    execute: async (interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const { options } = interaction;
        const discordId = interaction.user.id;
        const email = options.get("email").value;
        const username = options.get("username").value;
        const password = options.get("password").value;

        const resp = await functions.registerUser(discordId, username, email, password);

        const embed = new MessageEmbed()
            .setColor(resp.status >= 400 ? "#EE4B2B" : "#FFD700")
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.avatarURL() })
            .addField('Message', resp.message)
            .setTimestamp();

        if (resp.status >= 400) {
            return interaction.editReply({ embeds: [embed], ephemeral: true });
        }

        (interaction.channel ? interaction.channel : interaction.user).send({ embeds: [embed] });
        interaction.editReply({ content: "You successfully created an account!", ephemeral: true });
    }
};