import type { TelegramClient } from "@bot-machine/telegram-client";
import type {
	InlineKeyboardMarkup,
	Message,
    InlineKeyboardButton,
} from "@bot-machine/telegram-client";
import { MessageBuilder } from "../infra/message-builder";
import { MOCK_ORDERS, MOCK_SPECIALISTS } from "../app/mock-data";
import type { Order, Specialist } from "../app/mock-data";

// --- Generic Helper ---
async function sendOrEdit(
	client: TelegramClient,
	chatId: number,
	text: string,
	keyboard: InlineKeyboardMarkup,
	messageId?: number,
): Promise<Message> {
	const payload = {
		chat_id: chatId,
		text,
		reply_markup: keyboard,
		parse_mode: "MarkdownV2" as const,
	};
	if (messageId) {
		try {
			const result = await client.editMessageText({
				...payload,
				message_id: messageId,
			});
			return typeof result === "boolean"
				? { message_id: messageId, chat: { id: chatId, type: "private" }, date: Date.now() }
				: result;
		} catch (e) {
			console.warn(`Could not edit message: ${e}. Sending a new one.`);
			return await client.sendMessage(payload);
		}
	} else {
		return await client.sendMessage(payload);
	}
}

// --- Entry Point ---

export const showRoleSelectionMenu = async (
	client: TelegramClient,
	chatId: number,
	messageId?: number,
) => {
	const text = new MessageBuilder()
		.addText("Привет! Это HIRE — бот для быстрого поиска проверенных креативных специалистов.")
		.build();

	const keyboard: InlineKeyboardMarkup = {
		inline_keyboard: [
			[{ text: "Я клиент", callback_data: "role_client" }],
			[{ text: "Я исполнитель", callback_data: "role_specialist" }],
		],
	};

	return sendOrEdit(client, chatId, text, keyboard, messageId);
};

// --- Client (Employer) Flow ---

export const showProfessionFilterScreen = async (
    client: TelegramClient,
    chatId: number,
    messageId?: number,
) => {
    const text = new MessageBuilder()
        .addBold("Какого специалиста вы ищете?")
        .build();

    const professions = [...new Set(MOCK_SPECIALISTS.map(s => s.profession))];
    const professionButtons = professions.map(p => ([{
        text: p,
        callback_data: `filter_profession_${p}`
    }]));

    const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
            [{ text: "⭐ Мое избранное", callback_data: "show_spec_favorites" }],
            ...professionButtons,
        ],
    };

    return sendOrEdit(client, chatId, text, keyboard, messageId);
};

export const showSpecialistFavoritesScreen = async (
    client: TelegramClient,
    chatId: number,
    favoriteSpecialists: Specialist[],
    messageId?: number,
) => {
    const text = new MessageBuilder().addBold("⭐ Избранные специалисты").build();

    let buttons: InlineKeyboardButton[][] = favoriteSpecialists.length > 0
        ? favoriteSpecialists.map(s => ([{
            text: `👤 ${s.name} - ${s.profession}`,
            callback_data: `view_specialist_${s.id}`
        }]))
        : [[{ text: "Список пуст", callback_data: "no_op" }]];

    const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
            ...buttons,
            [{ text: "⬅️ Назад к фильтрам", callback_data: "role_client" }],
        ]
    };

    return sendOrEdit(client, chatId, text, keyboard, messageId);
}

export const showSpecialistCard = async (
	client: TelegramClient,
	chatId: number,
	specialist: Specialist,
    contextualCallback: { text: string, data: string },
	messageId?: number,
) => {
	const text = new MessageBuilder()
        .addText(`👤 ${specialist.name} — ${specialist.profession}`)
        .newLine()
        .addText(`💼 ${specialist.experience} | 💲 ${specialist.rate}`)
        .newLine()
        .addText(`🏷️ #${specialist.tags.join(" #")}`)
        .newLine()
        .addText(`📎 ${specialist.portfolio}`)
        .newLine(2)
        .addBold("О себе:")
        .newLine()
        .addText(specialist.about)
		.build();

	const keyboard: InlineKeyboardMarkup = {
		inline_keyboard: [
			[
				{ text: "👍 Написать", callback_data: `contact_${specialist.id}` },
                { text: contextualCallback.text, callback_data: contextualCallback.data },
				{ text: "⭐ В избранное", callback_data: `favorite_spec_${specialist.id}` },
			],
		],
	};

	return sendOrEdit(client, chatId, text, keyboard, messageId);
};

export const showNoMoreSpecialists = async (
    client: TelegramClient,
    chatId: number,
    messageId?: number,
) => {
    const text = new MessageBuilder().addText("На данный момент это все специалисты по вашему запросу.").build();
    const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
            [{ text: "⭐ Посмотреть избранное", callback_data: "show_spec_favorites" }],
            [{ text: "Искать заново", callback_data: "role_client" }]
        ]
    };
    return sendOrEdit(client, chatId, text, keyboard, messageId);
}

// --- Specialist (Worker) Flow ---

export const showOrderCategoryFilterScreen = async (
    client: TelegramClient,
    chatId: number,
    messageId?: number,
) => {
    const text = new MessageBuilder().addBold("Какие заказы вы ищете?").build();

    // Simple categorization based on skills for the demo
    const categories = ["Дизайн", "Видео", "Разработка", "Тексты"];
    const categoryButtons = categories.map(c => ([{ text: c, callback_data: `filter_order_${c}` }]));

    const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
            [{ text: "⭐ Мое избранное", callback_data: "show_order_favorites" }],
            ...categoryButtons,
        ],
    };

    return sendOrEdit(client, chatId, text, keyboard, messageId);
};

export const showOrderFavoritesScreen = async (
    client: TelegramClient,
    chatId: number,
    favoriteOrders: Order[],
    messageId?: number,
) => {
    const text = new MessageBuilder().addBold("⭐ Избранные заказы").build();

    let buttons: InlineKeyboardButton[][] = favoriteOrders.length > 0
        ? favoriteOrders.map(o => ([{ text: `🧾 ${o.title}`, callback_data: `view_order_${o.id}` }]))
        : [[{ text: "Список пуст", callback_data: "no_op" }]];

    const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
            ...buttons,
            [{ text: "⬅️ Назад к фильтрам", callback_data: "role_specialist" }],
        ]
    };

    return sendOrEdit(client, chatId, text, keyboard, messageId);
}

export const showOrderCard = async (
	client: TelegramClient,
	chatId: number,
	order: Order,
    contextualCallback: { text: string, data: string },
    appliedOrderIds: string[],
	messageId?: number,
) => {
	const text = new MessageBuilder()
        .addBold(`🧾 ${order.title}`)
        .newLine(2)
        .addText(order.description)
        .newLine(2)
        .addBold("Бюджет:").addText(` ${order.budget}`)
        .newLine()
        .addBold("Навыки:").addText(` #${order.skills.join(" #")}`)
		.build();

    const applyButton: InlineKeyboardButton = appliedOrderIds.includes(order.id)
        ? { text: "Вы откликнулись ✅", callback_data: "no_op" }
        : { text: "👍 Откликнуться", callback_data: `apply_${order.id}` };

	const keyboard: InlineKeyboardMarkup = {
		inline_keyboard: [
			[
				applyButton,
                { text: contextualCallback.text, callback_data: contextualCallback.data },
				{ text: "⭐ В избранное", callback_data: `favorite_order_${order.id}` },
			],
		],
	};

	return sendOrEdit(client, chatId, text, keyboard, messageId);
};

export const showNoMoreOrders = async (
    client: TelegramClient,
    chatId: number,
    messageId?: number,
) => {
    const text = new MessageBuilder().addText("На данный момент это все заказы по вашему запросу.").build();
    const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
            [{ text: "⭐ Посмотреть избранное", callback_data: "show_order_favorites" }],
            [{ text: "Искать заново", callback_data: "role_specialist" }]
        ]
    };
    return sendOrEdit(client, chatId, text, keyboard, messageId);
}