import definePlugin from "@utils/types";
import { ApplicationCommandInputType, ApplicationCommandOptionType } from "@api/Commands";
import { sendBotMessage } from "@api/Commands";
import { UserStore, GuildStore } from "@webpack/common";
import { findByPropsLazy } from "@webpack";

const getUser = findByPropsLazy("getUser");
const UserStatusStore = findByPropsLazy("setCustomStatus");
const PermissionsBits = findByPropsLazy("ADMINISTRATOR", "MANAGE_GUILD", "MANAGE_CHANNELS", "MANAGE_ROLES", "KICK_MEMBERS", "BAN_MEMBERS", "MODERATE_MEMBERS");

export default definePlugin({
  name: "multi-commands",
  description: "Adds /hello, /preview, /userinfo, /status, /checkperm, /owner, and /modlist commands",
  authors: ["YourName"],

  commands: [
    {
      inputType: ApplicationCommandInputType.BUILT_IN,
      name: "hello",
      description: "Say hello as yourself",
      options: [],
      execute: async (_, cmdCtx) => {
        await sendBotMessage(cmdCtx.channel.id, {
          content: "Hello",
          author: UserStore.getCurrentUser(),
        });
      },
    },

    {
      inputType: ApplicationCommandInputType.BUILT_IN,
      name: "preview",
      description: "Send a preview message as a custom bot user (optionally as embed)",
      options: [
        {
          name: "text",
          description: "Text to preview",
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
        {
          name: "embed",
          description: "Send message as an embed",
          type: ApplicationCommandOptionType.BOOLEAN,
          required: false,
        },
      ],
      execute: async (opts, cmdCtx) => {
        const textOption = opts.find(o => o.name === "text");
        const embedOption = opts.find(o => o.name === "embed");
        const text = textOption?.value as string;
        const embed = embedOption?.value as boolean | undefined;

        if (!text || text.trim().length === 0) {
          await sendBotMessage(cmdCtx.channel.id, {
            content: "Please provide some text to preview!",
            author: UserStore.getCurrentUser(),
          });
          return;
        }

        const customBotUser = {
          id: "643945264868098049", // fake ID
          username: "Discord UwU",
          discriminator: "6969",
          avatar: "https://cdn.discordapp.com/avatars/643945264868098049/c6a249645d46209f337279cd2ca998c7.webp?size=80",
          bot: false,
        };

        if (embed) {
          await sendBotMessage(cmdCtx.channel.id, {
            author: customBotUser,
            embeds: [
              {
                description: text,
                color: 0x5865f2, // Discord blurple color
              },
            ],
          });
        } else {
          await sendBotMessage(cmdCtx.channel.id, {
            content: text,
            author: customBotUser,
          });
        }
      },
    },

    {
      inputType: ApplicationCommandInputType.BUILT_IN,
      name: "userinfo",
      description: "Get info about a user by ID or mention",
      options: [
        {
          name: "user",
          description: "User to get info for",
          type: ApplicationCommandOptionType.USER,
          required: true,
        },
      ],
      execute: async (opts, cmdCtx) => {
        const userOption = opts.find(o => o.name === "user");
        if (!userOption) return;

        try {
          const user = await getUser.getUser(userOption.value);
          if (!user) {
            await sendBotMessage(cmdCtx.channel.id, {
              content: "User not found.",
              author: UserStore.getCurrentUser(),
            });
            return;
          }

          const content = `**User Info**  
**Username:** ${user.username}#${user.discriminator}  
**ID:** ${user.id}  
**Bot:** ${user.bot ? "Yes" : "No"}  
**Avatar:** [Link](https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png)`;

          await sendBotMessage(cmdCtx.channel.id, {
            content,
            author: UserStore.getCurrentUser(),
          });
        } catch (err) {
          await sendBotMessage(cmdCtx.channel.id, {
            content: `Error fetching user info: ${err}`,
            author: UserStore.getCurrentUser(),
          });
        }
      },
    },

    {
      inputType: ApplicationCommandInputType.BUILT_IN,
      name: "status",
      description: "Set your custom Discord status",
      options: [
        {
          name: "text",
          description: "The status text",
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
      ],
      execute: async (opts, cmdCtx) => {
        const textOption = opts.find(o => o.name === "text");
        if (!textOption || !textOption.value) {
          await sendBotMessage(cmdCtx.channel.id, {
            content: "Please provide a status text.",
            author: UserStore.getCurrentUser(),
          });
          return;
        }

        try {
          UserStatusStore.setCustomStatus({ text: textOption.value });
          await sendBotMessage(cmdCtx.channel.id, {
            content: `Status updated to: "${textOption.value}"`,
            author: UserStore.getCurrentUser(),
          });
        } catch (err) {
          await sendBotMessage(cmdCtx.channel.id, {
            content: `Failed to set status: ${err}`,
            author: UserStore.getCurrentUser(),
          });
        }
      },
    },

    {
      inputType: ApplicationCommandInputType.BUILT_IN,
      name: "checkperm",
      description: "Check if a user has a specific permission",
      options: [
        {
          name: "user",
          description: "User to check",
          type: ApplicationCommandOptionType.USER,
          required: true,
        },
        {
          name: "permission",
          description: "Permission to check (e.g., ADMINISTRATOR)",
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
      ],
      execute: async (opts, cmdCtx) => {
        const userOption = opts.find(o => o.name === "user");
        const permOption = opts.find(o => o.name === "permission");
        if (!userOption || !permOption) return;

        try {
          const user = await getUser.getUser(userOption.value);
          if (!user) {
            await sendBotMessage(cmdCtx.channel.id, {
              content: "User not found.",
              author: UserStore.getCurrentUser(),
            });
            return;
          }

          const guild = GuildStore.getGuild(cmdCtx.guild?.id);
          if (!guild) {
            await sendBotMessage(cmdCtx.channel.id, {
              content: "This command must be run inside a server.",
              author: UserStore.getCurrentUser(),
            });
            return;
          }

          // Get permission bit for requested permission
          const permissionBit = PermissionsBits[permOption.value.toUpperCase()];
          if (!permissionBit) {
            await sendBotMessage(cmdCtx.channel.id, {
              content: `Unknown permission: ${permOption.value}`,
              author: UserStore.getCurrentUser(),
            });
            return;
          }

          // Get member
          const member = guild.members.get(user.id);
          if (!member) {
            await sendBotMessage(cmdCtx.channel.id, {
              content: "User is not a member of this server.",
              author: UserStore.getCurrentUser(),
            });
            return;
          }

          const userPerms = member.permissions; // bigint or number
          const hasPerm = (userPerms & permissionBit) === permissionBit;

          await sendBotMessage(cmdCtx.channel.id, {
            content: `User <@${user.id}> ${hasPerm ? "has" : "does NOT have"} the permission **${permOption.value.toUpperCase()}**.`,
            author: UserStore.getCurrentUser(),
          });
        } catch (err) {
          await sendBotMessage(cmdCtx.channel.id, {
            content: `Error checking permission: ${err}`,
            author: UserStore.getCurrentUser(),
          });
        }
      },
    },

    {
      inputType: ApplicationCommandInputType.BUILT_IN,
      name: "owner",
      description: "Show the owner of this server",
      options: [],
      execute: async (_, cmdCtx) => {
        const guild = GuildStore.getGuild(cmdCtx.guild?.id);
        if (!guild) {
          await sendBotMessage(cmdCtx.channel.id, {
            content: "This command must be run inside a server.",
            author: UserStore.getCurrentUser(),
          });
          return;
        }
        const ownerId = guild.ownerId;
        await sendBotMessage(cmdCtx.channel.id, {
          content: `The owner of this server is <@${ownerId}>.`,
          author: UserStore.getCurrentUser(),
        });
      },
    },

    {
      inputType: ApplicationCommandInputType.BUILT_IN,
      name: "modlist",
      description: "List all moderators on the server",
      options: [],
      execute: async (_, cmdCtx) => {
        const guild = GuildStore.getGuild(cmdCtx.guild?.id);
        if (!guild) {
          await sendBotMessage(cmdCtx.channel.id, {
            content: "This command must be run inside a server.",
            author: UserStore.getCurrentUser(),
          });
          return;
        }

        // Define moderator permissions
        const modPerms = [
          PermissionsBits.MANAGE_GUILD,
          PermissionsBits.MANAGE_CHANNELS,
          PermissionsBits.MANAGE_ROLES,
          PermissionsBits.KICK_MEMBERS,
          PermissionsBits.BAN_MEMBERS,
          PermissionsBits.MODERATE_MEMBERS,
        ];

        const members = Array.from(guild.members.values());
        const mods = members.filter(member => {
          for (const perm of modPerms) {
            if ((member.permissions & perm) === perm) return true;
          }
          return false;
        });

        if (mods.length === 0) {
          await sendBotMessage(cmdCtx.channel.id, {
            content: "No moderators detected on this server.",
            author: UserStore.getCurrentUser(),
          });
          return;
        }

        const mentions = mods.map(m => `<@${m.userId}>`).join(", ");
        await sendBotMessage(cmdCtx.channel.id, {
          content: `Current moderators: ${mentions}`,
          author: UserStore.getCurrentUser(),
        });
      },
    },
  ],
});
