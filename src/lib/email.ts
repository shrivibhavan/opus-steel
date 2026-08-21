import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL || "OPUS Steel <onboarding@resend.dev>";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Core utility to send transactional email via Resend.
 * Falls back to console logging in development if RESEND_API_KEY is not set.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!resend) {
    console.log(`[Email Service Dev Fallback]
To: ${Array.isArray(to) ? to.join(", ") : to}
Subject: ${subject}
Content: ${text || "HTML Email Content"}`);
    return { success: true, simulated: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: resendFromEmail,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, "")
    });

    if (error) {
      console.error("[Resend Email Error]:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[Resend Email Exception]:", err);
    return { success: false, error: err };
  }
}

/**
 * Notifies Plant Managers and Production team when an Office user releases a Work Order.
 */
export async function sendWorkOrderReleasedEmail({
  workOrderNumber,
  projectTitle,
  recipientEmail,
  recipientName,
  link
}: {
  workOrderNumber: string;
  projectTitle: string;
  recipientEmail: string;
  recipientName: string;
  link: string;
}) {
  const subject = `[OPUS Steel Alert] Work Order ${workOrderNumber} Released for Production`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e293b; margin-top: 0;">Work Order Released</h2>
      <p>Hello <strong>${recipientName}</strong>,</p>
      <p>Work Order <strong>${workOrderNumber}</strong> for project <strong>${projectTitle}</strong> has been released by Office and is now ready for plant production.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0284c7; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Status:</strong> Ready for Production</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #475569;"><strong>Work Order #:</strong> ${workOrderNumber}</p>
      </div>

      <a href="${link}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">View Work Order</a>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 15px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">OPUS Steel Construction LLC — Production Management System</p>
    </div>
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    html
  });
}

/**
 * Notifies Management and Office when a Dispatch is created.
 */
export async function sendDispatchNotificationEmail({
  dispatchNumber,
  workOrderNumber,
  quantity,
  recipientEmail,
  recipientName
}: {
  dispatchNumber: string;
  workOrderNumber: string;
  quantity: number | string;
  recipientEmail: string;
  recipientName: string;
}) {
  const subject = `[OPUS Steel Alert] Dispatch ${dispatchNumber} Completed (${quantity} units)`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #1e293b; margin-top: 0;">Dispatch Recorded</h2>
      <p>Hello <strong>${recipientName}</strong>,</p>
      <p>Dispatch <strong>${dispatchNumber}</strong> has been successfully created for Work Order <strong>${workOrderNumber}</strong>.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-size: 14px; color: #475569;"><strong>Dispatch #:</strong> ${dispatchNumber}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #475569;"><strong>Dispatched Quantity:</strong> ${quantity} Nos</p>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0 15px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin: 0;">OPUS Steel Construction LLC — Production Management System</p>
    </div>
  `;

  return sendEmail({
    to: recipientEmail,
    subject,
    html
  });
}
