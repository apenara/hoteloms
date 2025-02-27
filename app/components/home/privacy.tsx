import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader className="text-center border-b pb-6">
          <CardTitle className="text-3xl font-bold">
            Política de Privacidad
          </CardTitle>
          <p className="text-gray-500 mt-2">
            Última actualización:{" "}
            {new Date().toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </CardHeader>
        <CardContent className="pt-8 prose prose-blue max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introducción</h2>
            <p>
              En HotelOms, respetamos su privacidad y nos comprometemos a
              proteger sus datos personales. Esta Política de Privacidad
              describe cómo recopilamos, utilizamos, procesamos y almacenamos su
              información cuando utiliza nuestra plataforma de gestión hotelera.
            </p>
            <p>
              Al utilizar nuestros servicios, usted acepta las prácticas
              descritas en esta política. Le recomendamos leer detenidamente
              este documento para comprender nuestros procedimientos respecto a
              sus datos personales.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. Información que Recopilamos
            </h2>

            <h3 className="text-xl font-medium mt-6 mb-3">
              2.1 Información proporcionada por usted
            </h3>
            <p>
              Recopilamos la siguiente información que usted nos proporciona
              directamente:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Información de registro y cuenta:</strong> Nombre del
                hotel, dirección, información de contacto, credenciales de
                acceso.
              </li>
              <li>
                <strong>Información de perfil:</strong> Nombres de contacto,
                cargos, números telefónicos, correos electrónicos del personal
                autorizado.
              </li>
              <li>
                <strong>Información de facturación:</strong> Datos bancarios,
                información de tarjetas de crédito, datos fiscales.
              </li>
              <li>
                <strong>Datos de configuración:</strong> Información sobre
                habitaciones, categorías, tarifas y otros datos relacionados con
                la operación de su hotel.
              </li>
              <li>
                <strong>Comunicaciones:</strong> Información que proporciona
                cuando se comunica con nuestro equipo de soporte.
              </li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">
              2.2 Información recopilada automáticamente
            </h3>
            <p>
              Recopilamos automáticamente cierta información cuando utiliza
              nuestra plataforma:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Datos de uso:</strong> Información sobre cómo utiliza
                nuestra plataforma, incluyendo frecuencia de uso, funciones más
                utilizadas y patrones de interacción.
              </li>
              <li>
                <strong>Información del dispositivo:</strong> Tipo de
                dispositivo, sistema operativo, navegador, dirección IP y
                configuración de idioma.
              </li>
              <li>
                <strong>Cookies y tecnologías similares:</strong> Utilizamos
                cookies y tecnologías similares para recopilar información sobre
                su actividad, preferencias y navegación en nuestra plataforma.
              </li>
            </ul>

            <h3 className="text-xl font-medium mt-6 mb-3">
              2.3 Información operativa del hotel
            </h3>
            <p>
              Para proporcionar nuestros servicios, procesamos datos
              relacionados con la operación hotelera, incluyendo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Estado de habitaciones y asignaciones de personal</li>
              <li>Registros de limpieza, mantenimiento e inventario</li>
              <li>Métricas operativas y estadísticas de desempeño</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              3. Cómo Utilizamos su Información
            </h2>

            <p>Utilizamos la información recopilada para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Proporcionar y mantener nuestros servicios:</strong>{" "}
                Configurar y mantener su cuenta, procesar pagos y brindar
                soporte técnico.
              </li>
              <li>
                <strong>Mejorar nuestros servicios:</strong> Entender cómo los
                usuarios interactúan con nuestra plataforma para mejorar las
                funcionalidades existentes y desarrollar nuevas características.
              </li>
              <li>
                <strong>Personalizar su experiencia:</strong> Adaptar ciertos
                aspectos de nuestros servicios a sus preferencias y necesidades
                específicas.
              </li>
              <li>
                <strong>Comunicarnos con usted:</strong> Enviarle
                notificaciones, actualizaciones, alertas de seguridad y mensajes
                de soporte relacionados con el servicio.
              </li>
              <li>
                <strong>Marketing:</strong> Enviarle información sobre nuevas
                características, ofertas y eventos relacionados con HotelOms
                (siempre con la opción de darse de baja).
              </li>
              <li>
                <strong>Seguridad:</strong> Detectar, prevenir y abordar
                problemas técnicos, fraudes y actividades potencialmente
                ilegales.
              </li>
              <li>
                <strong>Cumplimiento legal:</strong> Cumplir con obligaciones
                legales y normativas aplicables.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4. Compartición de Información
            </h2>

            <p>
              No vendemos ni alquilamos su información personal a terceros. Sin
              embargo, podemos compartir su información en las siguientes
              circunstancias:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Proveedores de servicios:</strong> Compartimos
                información con proveedores de servicios que nos ayudan a
                operar, desarrollar y mejorar nuestra plataforma (procesamiento
                de pagos, alojamiento de datos, análisis, etc.).
              </li>
              <li>
                <strong>Cumplimiento legal:</strong> Podemos divulgar
                información cuando sea necesario para cumplir con una obligación
                legal, proteger nuestros derechos o los derechos de terceros, o
                responder a solicitudes de autoridades públicas.
              </li>
              <li>
                <strong>Fusiones y adquisiciones:</strong> En caso de fusión,
                adquisición o venta de activos, su información puede ser
                transferida como parte de los activos empresariales.
              </li>
              <li>
                <strong>Con su consentimiento:</strong> Podemos compartir su
                información con terceros cuando usted nos haya dado su
                consentimiento para hacerlo.
              </li>
            </ul>

            <p className="mt-4">
              Todos los proveedores de servicios con los que compartimos
              información están obligados a proteger y utilizar sus datos
              únicamente para los fines específicos que hemos autorizado.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              5. Seguridad de la Información
            </h2>

            <p>
              Implementamos medidas de seguridad técnicas, administrativas y
              físicas diseñadas para proteger la información personal que
              recopilamos y procesamos:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>
                Utilizamos cifrado de nivel bancario (SSL/TLS) para proteger la
                transmisión de datos.
              </li>
              <li>
                Almacenamos los datos en servidores seguros con certificaciones
                ISO 27001.
              </li>
              <li>
                Implementamos controles de acceso estrictos para limitar quién
                puede acceder a la información.
              </li>
              <li>
                Realizamos copias de seguridad regulares y pruebas de
                penetración para evaluar nuestra seguridad.
              </li>
              <li>
                Capacitamos a nuestro personal sobre prácticas de seguridad y
                privacidad de datos.
              </li>
            </ul>

            <p className="mt-4">
              A pesar de nuestros esfuerzos, ningún método de transmisión por
              Internet o método de almacenamiento electrónico es 100% seguro.
              Por lo tanto, no podemos garantizar su seguridad absoluta.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              6. Retención de Datos
            </h2>

            <p>
              Conservamos su información personal durante el tiempo necesario
              para proporcionar los servicios que ha solicitado y para los fines
              descritos en esta política. Los periodos de retención específicos
              dependen del tipo de información y los requisitos legales
              aplicables.
            </p>

            <p className="mt-4">
              Cuando ya no necesitemos su información personal, la eliminaremos
              o anonimizaremos de manera segura. Sin embargo, podemos retener
              cierta información por periodos más largos cuando sea necesario
              para cumplir con obligaciones legales, resolver disputas o hacer
              cumplir nuestros acuerdos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Sus Derechos</h2>

            <p>
              Según la legislación aplicable, usted puede tener los siguientes
              derechos con respecto a su información personal:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Acceso:</strong> Derecho a solicitar una copia de la
                información personal que mantenemos sobre usted.
              </li>
              <li>
                <strong>Rectificación:</strong> Derecho a solicitar la
                corrección de información personal inexacta o incompleta.
              </li>
              <li>
                <strong>Eliminación:</strong> Derecho a solicitar la eliminación
                de su información personal en determinadas circunstancias.
              </li>
              <li>
                <strong>Restricción de procesamiento:</strong> Derecho a
                solicitar la limitación del procesamiento de su información
                personal.
              </li>
              <li>
                <strong>Portabilidad de datos:</strong> Derecho a recibir una
                copia de su información personal en un formato estructurado, de
                uso común y legible por máquina.
              </li>
              <li>
                <strong>Oposición:</strong> Derecho a oponerse al procesamiento
                de su información personal en determinadas circunstancias.
              </li>
              <li>
                <strong>Retirada de consentimiento:</strong> Derecho a retirar
                el consentimiento en cualquier momento cuando el procesamiento
                se base en su consentimiento.
              </li>
            </ul>

            <p className="mt-4">
              Para ejercer estos derechos, por favor contacte con nosotros a
              través de{" "}
              <a
                href="mailto:privacidad@HotelOms.com"
                className="text-primary hover:underline"
              >
                privacidad@HotelOms.com
              </a>
              . Responderemos a su solicitud dentro del plazo establecido por la
              ley aplicable.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              8. Cumplimiento Normativo
            </h2>

            <p>
              Nuestra política de privacidad está diseñada para cumplir con las
              leyes y regulaciones aplicables de protección de datos en
              Colombia, incluyendo:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>Ley 1581 de 2012 (Ley de Protección de Datos Personales)</li>
              <li>Decreto 1377 de 2013</li>
              <li>Decreto 886 de 2014</li>
            </ul>

            <p className="mt-4">
              Si tiene su sede en otra jurisdicción, puede estar sujeto a
              diferentes requisitos legales. Le recomendamos consultar con su
              asesor legal sobre las implicaciones específicas para su negocio.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              9. Cambios a esta Política
            </h2>

            <p>
              Podemos actualizar esta Política de Privacidad periódicamente para
              reflejar cambios en nuestras prácticas o por otros motivos
              operativos, legales o regulatorios. Le notificaremos cualquier
              cambio material publicando la nueva Política de Privacidad en esta
              página y, en caso de cambios significativos, le enviaremos una
              notificación.
            </p>

            <p className="mt-4">
              Le recomendamos revisar esta Política de Privacidad periódicamente
              para estar informado sobre cómo protegemos su información.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Contacto</h2>

            <p>
              Si tiene preguntas o inquietudes sobre esta Política de Privacidad
              o sobre nuestras prácticas de datos, por favor contáctenos:
            </p>

            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <p>
                <strong>HotelOms Colombia</strong>
              </p>
              <p>Dirección: Calle 82 #12-34, Oficina 501</p>
              <p>Bogotá, Colombia</p>
              <p>
                Email:{" "}
                <a
                  href="mailto:privacidad@HotelOms.com"
                  className="text-primary hover:underline"
                >
                  privacidad@HotelOms.com
                </a>
              </p>
              <p>Teléfono: +57 601 123 4567</p>
            </div>
          </section>

          <div className="mt-10 border-t pt-8 text-center">
            <p>
              © {new Date().getFullYear()} HotelOms | Todos los derechos
              reservados
            </p>
            <div className="mt-4">
              <Link href="/" className="text-primary hover:underline">
                Volver a la página principal
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
