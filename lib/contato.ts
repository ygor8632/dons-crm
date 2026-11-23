/**
 * Contato comercial: WhatsApp da Dons com mensagem pronta. NEXT_PUBLIC_CONTATO_URL,
 * se definida na hospedagem, substitui este endereço (outro número, e-mail ou agenda).
 */
const WHATSAPP_COMERCIAL = '5561981776025';
const MENSAGEM = 'Olá! Vi o site do Dons CRM e quero conversar sobre a implantação na minha empresa.';

export const CONTATO_URL = process.env.NEXT_PUBLIC_CONTATO_URL || `https://wa.me/${WHATSAPP_COMERCIAL}?text=${encodeURIComponent(MENSAGEM)}`;
