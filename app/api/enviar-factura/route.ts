import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import path from 'path';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.warn(`[SOC ALERT] 🛡️ Intento de acceso no autorizado a Envío de Facturas. VULN-1 (Open Mail Relay) bloqueada.`);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { clienteEmail, clienteName, monto, pdfBase64, idFactura, isCotizacion } = body;

    if (!clienteEmail) {
      return NextResponse.json({ error: 'Email del cliente es requerido' }, { status: 400 });
    }

    // Configurar el transportador de nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Recordatorio: Debe ser una Contraseña de Aplicación de 16 caracteres.
      },
    });

    // Formatear mensaje del correo
    const nameStr = clienteName ? `${clienteName}` : 'Cliente';
    const montoFormatted = monto ? Number(monto).toLocaleString('es-CO') : '0.00';
    const ordenStr = idFactura || 'Generica';

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaebed; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        
        <!-- Anti-Trimming para Gmail -->
        <div style="display: none; max-height: 0px; overflow: hidden;">
          RefFactura: ${idFactura}-${Date.now()}
        </div>

        <!-- Header / Banner -->
        <div style="background-color: #000000; text-align: center; font-size: 0; line-height: 0;">
          <img src="cid:banner_ggl" alt="GGL Logística y Distribución" style="width: 100%; height: auto; display: block; margin: 0; padding: 0; border-top-left-radius: 12px; border-top-right-radius: 12px;" />
        </div>
        
        <!-- Cuerpo -->
        <div style="padding: 40px 30px; background-color: #ffffff; color: #374151;">
          <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">
            Hola, <strong>${nameStr}</strong> 👋
          </p>
          <p style="font-size: 16px; line-height: 1.6;">
            ${isCotizacion 
              ? '¡Gracias por confiar en GGL Logística y Distribución! Hemos generado la cotización solicitada para tu servicio. 📄' 
              : '¡Gracias por confiar en GGL Logística y Distribución! Queremos informarte que tu pago se ha procesado correctamente. ✅'}
          </p>
          
          <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-left: 4px solid ${isCotizacion ? '#f59e0b' : '#3b82f6'}; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; font-size: 16px; font-weight: bold; color: ${isCotizacion ? '#92400e' : '#1e3a8a'};">
              Resumen de tu ${isCotizacion ? 'cotización' : 'factura'}:
            </p>
            <ul style="list-style: none; padding-left: 0; margin: 0; font-size: 15px;">
              <li style="margin-bottom: 8px;">💰 <strong>Valor total:</strong> $${montoFormatted}</li>
              <li style="margin-bottom: 8px;">📄 <strong>Documento:</strong> Adjunto en este correo (PDF)</li>
              <li style="margin-bottom: 0;">📦 <strong>Servicio:</strong> Logística y Distribución</li>
            </ul>
          </div>

          <p style="font-size: 16px; line-height: 1.6;">
            ${isCotizacion 
              ? '<strong>Importante:</strong> Apenas se realice el pago de la totalidad se realizará el envío de la mercancía. 🚛💨' 
              : 'Estamos trabajando para que todo llegue a su destino a tiempo. 🕒'} 
            Si tienes alguna duda sobre tu ${isCotizacion ? 'cotización' : 'facturación'} o el estado de tu despacho, puedes escribirnos por este medio. ✉️
          </p>
          
          <p style="font-size: 16px; line-height: 1.6;">
            ¡Que tengas un excelente día! ☀️
          </p>

          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 0; margin-top: 30px;">
            Atentamente,<br/>
            <strong>El equipo de GGL 🚛💨</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #eaebed;">
          <p style="margin: 0; color: #6b7280; font-size: 13px;">
            GGL Logística y Distribución<br/>
            <a href="mailto:ggllogisticaydistribucion@gmail.com" style="color: #2563eb; text-decoration: none;">ggllogisticaydistribucion@gmail.com</a>
          </p>
        </div>
      </div>
    `;

    // Opciones del correo
    const mailOptions: any = {
      from: `"GGL Logística y Distribución" <${process.env.EMAIL_USER}>`,
      to: clienteEmail,
      subject: isCotizacion 
        ? `📄 Cotización de servicio - GGL Logística y Distribución - ${ordenStr}`
        : `📄 Factura de tu servicio en GGL Logística y Distribución - ${ordenStr}`,
      text: isCotizacion
        ? `Hola ${nameStr} 👋\n\n¡Gracias por confiar en GGL Logística y Distribución! Hemos generado la cotización solicitada para tu servicio. 📄\n\nResumen de tu cotización:\n💰 Valor total: $${montoFormatted}\n📄 Documento: Adjunto en este correo (PDF)\n📦 Servicio: Logística y Distribución\n\nImportante: Apenas se realice el pago de la totalidad se realizará el envío de la mercancía. 🚛💨\n\nSi tienes alguna duda sobre tu cotización o el estado de tu despacho, puedes escribirnos por este medio. ✉️\n\n¡Que tengas un excelente día! ☀️\n\nAtentamente,\nEl equipo de GGL 🚛💨`
        : `Hola ${nameStr} 👋\n\n¡Gracias por confiar en GGL Logística y Distribución! Queremos informarte que tu pago se ha procesado correctamente. ✅\n\nResumen de tu factura:\n💰 Valor total: $${montoFormatted}\n📄 Documento: Adjunto en este correo (PDF)\n📦 Servicio: Logística y Distribución\n\nEstamos trabajando para que todo llegue a su destino a tiempo. 🕒 Si tienes alguna duda sobre tu facturación o el estado de tu despacho, puedes escribirnos por este medio. ✉️\n\n¡Que tengas un excelente día! ☀️\n\nAtentamente,\nEl equipo de GGL 🚛💨`,
      html: htmlContent,
      attachments: [
        {
          filename: 'banner.png',
          path: path.join(process.cwd(), 'app', 'api', 'enviar-factura', 'Gemini_Generated_Image_vc21d0vc21d0vc21.png'),
          cid: 'banner_ggl' // Este mismo cid se usa en src="cid:banner_ggl" en el HTML
        }
      ]
    };

    if (pdfBase64) {
      mailOptions.attachments.push({
        filename: `${isCotizacion ? 'Cotizacion' : 'Factura'}_GGL_${idFactura || 'Generica'}.pdf`,
        content: pdfBase64,
        encoding: 'base64'
      });
    }

    // Enviar el correo
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Correo enviado éxitosamente' }, { status: 200 });

  } catch (error: any) {
    console.error('Error enviando correo:', error);
    return NextResponse.json(
      { error: 'Error al enviar el correo', details: error.message },
      { status: 500 }
    );
  }
}
