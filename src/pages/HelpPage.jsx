import { useOutletContext } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

// Long-form prose like this doesn't go through the usual t() lookups —
// with ~10 sections in two languages that'd mean 20+ one-off keys in
// translations.js for content that's read top-to-bottom once, not
// reused anywhere. Picking the array by `lang` directly keeps it
// bilingual without bloating the shared dictionary.
const SECTIONS = {
  en: [
    {
      title: 'Signing in',
      body: 'There\'s no password to remember. Enter your email wherever you see "Sign in to manage or join," and we\'ll send a one-time code — enter it and you\'re in. Browsing vendors and community info doesn\'t require an account at all; you only need to sign in to join the Service Board, save your unit info, or send feedback.',
    },
    {
      title: 'Finding your neighborhood',
      body: 'Search for it by name on the LoopListing homepage, or use "Browse all vendors" to search across every neighborhood on the platform at once. If your community isn\'t listed yet, use "Start a directory" from the homepage to request one.',
    },
    {
      title: 'Browsing vendors',
      body: 'Use the search box to look up a vendor, category, or street. The Category and Status filter pills narrow things down further — combine them to, say, see only Verified plumbers. Switch between grid and list view with the toggle near the top right, and use "Copy details to share" on any vendor card to grab their info for a text or email.',
    },
    {
      title: 'Association Contacts, Community Services, Emergency, and FAQ',
      body: 'These four sections are reference info kept up to date by your neighborhood\'s admins — board and management contacts, utility providers, emergency numbers, and answers to common questions. If something looks out of date, use Feedback (below) to flag it.',
    },
    {
      title: 'The Service Board',
      body: 'This is where residents post and track community issues and ideas — a pothole, a broken gate, a suggestion for the HOA. The first time you visit, you\'ll be asked for your name and unit to join. Once you\'re in, you can post a need, browse what others have posted, and click "I have this too" on anything you\'re also experiencing to help admins see what matters most. Sort by Recent or Most upvoted, and filter by category, severity, or status.',
    },
    {
      title: 'Sending feedback',
      body: 'The Feedback button (in the sidebar, or on the Community FAQ page) sends a note directly to your neighborhood\'s admins — report an issue or suggest an idea. You\'ll need to be signed in first.',
    },
    {
      title: 'Your account settings',
      body: 'Click your initials in the top right to update your name, email, or unit number. Changing your email sends a confirmation link before it takes effect.',
    },
  ],
  es: [
    {
      title: 'Iniciar sesión',
      body: 'No hay ninguna contraseña que recordar. Escribe tu correo donde veas "Inicia sesión para administrar o unirte" y te enviaremos un código de un solo uso — ingrésalo y listo. Explorar proveedores e información comunitaria no requiere cuenta; solo necesitas iniciar sesión para unirte al Tablón de Servicios, guardar los datos de tu unidad, o enviar comentarios.',
    },
    {
      title: 'Encontrar tu vecindario',
      body: 'Búscalo por nombre en la página principal de LoopListing, o usa "Ver todos los proveedores" para buscar en todos los vecindarios de la plataforma a la vez. Si tu comunidad todavía no está en la lista, usa "Crear un directorio" desde la página principal para solicitar uno.',
    },
    {
      title: 'Explorar proveedores',
      body: 'Usa la barra de búsqueda para buscar un proveedor, categoría o calle. Los filtros de Categoría y Estado te ayudan a acotar más — combínalos para ver, por ejemplo, solo plomeros verificados. Cambia entre vista de cuadrícula y lista con el botón junto a la esquina superior derecha, y usa "Copiar detalles para compartir" en cualquier tarjeta para llevar la información a un mensaje o correo.',
    },
    {
      title: 'Contactos de la Asociación, Servicios Comunitarios, Emergencia y Preguntas Frecuentes',
      body: 'Estas cuatro secciones son información de referencia que los administradores de tu vecindario mantienen actualizada — contactos de la junta y administración, proveedores de servicios públicos, números de emergencia y respuestas a preguntas comunes. Si algo parece desactualizado, usa Comentarios (más abajo) para avisar.',
    },
    {
      title: 'El Tablón de Servicios',
      body: 'Aquí es donde los residentes publican y dan seguimiento a problemas e ideas de la comunidad — un bache, un portón roto, una sugerencia para la HOA. La primera vez que entres, te pediremos tu nombre y unidad para unirte. Una vez dentro, puedes publicar una necesidad, ver lo que otros han publicado, y hacer clic en "Yo también tengo esto" en cualquier publicación que también te afecte, para ayudar a los administradores a ver qué es más importante. Ordena por Reciente o Más votados, y filtra por categoría, gravedad o estado.',
    },
    {
      title: 'Enviar comentarios',
      body: 'El botón Comentarios (en el menú lateral, o en la página de Preguntas Frecuentes) envía una nota directamente a los administradores de tu vecindario — reporta un problema o sugiere una idea. Necesitas haber iniciado sesión primero.',
    },
    {
      title: 'La configuración de tu cuenta',
      body: 'Haz clic en tus iniciales en la esquina superior derecha para actualizar tu nombre, correo o número de unidad. Cambiar tu correo envía un enlace de confirmación antes de que el cambio tome efecto.',
    },
  ],
}

export default function HelpPage() {
  const { neighborhood } = useOutletContext()
  const { t, lang } = useLanguage()
  usePageMeta({ title: t('help.title'), noindex: true })

  return (
    <div>
      <div className="masthead" style={{ padding: '0 0 22px' }}>
        <div>
          <p className="eyebrow">{t('help.eyebrow')}</p>
          <h1>{t('help.title')}</h1>
          <p className="tagline">{t('help.subtitle', { name: neighborhood?.name })}</p>
        </div>
      </div>

      {SECTIONS[lang].map((s) => (
        <div className="overview-subgroup" key={s.title} style={{ marginBottom: 18 }}>
          <h3 className="overview-subgroup-title">{s.title}</h3>
          <p className="sub">{s.body}</p>
        </div>
      ))}
    </div>
  )
}
