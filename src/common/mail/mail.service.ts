import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface CredencialesAdminEmail {
  destinatario:  string;   // email del nuevo admin
  nombreEmpresa: string;
  emailAdmin:    string;
  passwordAdmin: string;
  planNombre:    string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /**
   * Transporter lazy — se instancia al primer uso para que las variables
   * de entorno ya estén cargadas por ConfigModule antes de crear el socket.
   *
   * Puerto 587 + secure:false → nodemailer activa STARTTLS automáticamente.
   * Puerto 465 + secure:true  → SSL directo (cambiar MAIL_PORT y MAIL_SECURE en .env si es necesario).
   */
  private _transporter: nodemailer.Transporter | null = null;

  private get transporter(): nodemailer.Transporter {
    if (!this._transporter) {
      const port   = Number(process.env.MAIL_PORT   ?? 587);
      const secure = process.env.MAIL_SECURE === 'true'; // false por defecto → STARTTLS en 587

      this._transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST ?? 'mail.iatechsabana.online',
        port,
        secure,
        auth: {
          user: process.env.MAIL_USER ?? '',
          pass: process.env.MAIL_PASS ?? '',
        },
        tls: {
          rejectUnauthorized: false, // tolera certificados autofirmados en cPanel
        },
        connectionTimeout: 15_000,
        greetingTimeout:   10_000,
        socketTimeout:     30_000,
      });

      this.logger.log(`SMTP configurado → ${process.env.MAIL_HOST}:${port} secure=${secure}`);
    }
    return this._transporter;
  }

  // ── Diagnóstico: verifica la conexión SMTP al arrancar ──────────────────

  /** Llámalo desde el módulo raíz (onModuleInit) para confirmar que el SMTP responde */
  async verificarConexion(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('✅ Conexión SMTP verificada correctamente');
    } catch (err: any) {
      this.logger.warn(`⚠️  SMTP no disponible al arrancar (el correo fallará): ${err.message}`);
    }
  }

  // ── Envío de credenciales al crear una empresa ───────────────────────────

  async enviarCredencialesAdmin(data: CredencialesAdminEmail): Promise<void> {
    const { destinatario, nombreEmpresa, emailAdmin, passwordAdmin, planNombre } = data;

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a My Money</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0C3B2E,#1F5E4B);padding:36px 40px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <div style="width:56px;height:56px;background:#FFBA00;border-radius:50%;display:inline-block;line-height:56px;font-size:26px;font-weight:900;color:#0C3B2E;text-align:center;">M</div>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">¡Bienvenido a My Money!</h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,.75);font-size:14px;">Tu empresa ha sido registrada exitosamente</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6;">
              Hola, tu empresa <strong style="color:#0C3B2E;">${nombreEmpresa}</strong> ha sido registrada en el plan <strong style="color:#0C3B2E;">${planNombre}</strong>.
              A continuación están las credenciales de acceso del administrador:
            </p>

            <!-- Credenciales -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#EFF6F2;border:1px solid #C8E6D8;border-radius:14px;margin:24px 0;">
              <tr>
                <td style="padding:24px 28px;">
                  <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.8px;">Correo electrónico</p>
                  <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#0C3B2E;">${emailAdmin}</p>

                  <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.8px;">Contraseña temporal</p>
                  <p style="margin:0;font-size:22px;font-weight:900;color:#0C3B2E;letter-spacing:2px;background:#fff;padding:10px 16px;border-radius:8px;display:inline-block;border:1px solid #C8E6D8;">
                    ${passwordAdmin}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Aviso de seguridad -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#FFF8E1;border:1px solid #FFE082;border-radius:12px;margin-bottom:20px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0 0 6px;font-size:13px;color:#E65100;">
                    ⚠️ <strong>Por seguridad</strong>, cambia esta contraseña lo antes posible.
                  </p>
                  <p style="margin:0;font-size:13px;color:#555;line-height:1.5;">
                    El cambio de contraseña se realiza exclusivamente desde el
                    <strong>panel administrativo</strong>:<br>
                    <a href="https://mymoneyadmin.iatechsabana.online/tenant-select"
                       style="color:#0C3B2E;font-weight:700;word-break:break-all;">
                      https://mymoneyadmin.iatechsabana.online/tenant-select
                    </a>
                    <br><br>
                    Ingresa con las credenciales de arriba → selecciona tu empresa →
                    ve a <strong>Usuarios → Editar → Nueva contraseña</strong>.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Botón al panel -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="https://mymoneyadmin.iatechsabana.online/tenant-select"
                     style="display:inline-block;background:linear-gradient(135deg,#0C3B2E,#1F5E4B);
                            color:#fff;text-decoration:none;font-weight:700;font-size:14px;
                            padding:13px 32px;border-radius:10px;letter-spacing:.3px;">
                    Ir al panel administrativo →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#444;font-size:14px;line-height:1.6;">
              También puedes usar la app móvil / web con estas mismas credenciales.
              Selecciona tu empresa <strong>${nombreEmpresa}</strong> desde la pantalla de inicio.
            </p>

            <p style="margin:0;color:#888;font-size:12px;border-top:1px solid #eee;padding-top:20px;">
              Si no solicitaste este registro, por favor ignora este correo o contáctanos en
              <a href="mailto:soporte@iatechsabana.online" style="color:#0C3B2E;">soporte@iatechsabana.online</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
            <p style="margin:0;color:#aaa;font-size:12px;">
              © ${new Date().getFullYear()} My Money · IATech Sabana Online<br>
              <a href="https://mymoney.iatechsabana.online" style="color:#0C3B2E;text-decoration:none;">mymoney.iatechsabana.online</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      const info = await this.transporter.sendMail({
        from:    process.env.MAIL_FROM ?? '"My Money" <no-reply@iatechsabana.online>',
        to:      destinatario,
        subject: `✅ Tu empresa "${nombreEmpresa}" fue registrada — Credenciales de acceso`,
        html,
      });
      this.logger.log(`Correo de credenciales enviado a ${destinatario} — messageId: ${info.messageId}`);
    } catch (err: any) {
      // No interrumpir el registro si el correo falla — solo loguear el error
      this.logger.error(`Error al enviar correo a ${destinatario}: ${err.message}`);
    }
  }
}
