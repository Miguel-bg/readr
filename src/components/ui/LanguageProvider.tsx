'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type AppLanguage = 'pt' | 'en' | 'es'

const translations: Record<AppLanguage, Record<string, string>> = {
  pt: {},
  en: {
    'Início': 'Home', 'Biblioteca': 'Library', 'Minha Biblioteca': 'My Library', 'Minha estante': 'My shelf', 'Minha Estante': 'My Shelf',
    'Criados': 'Created', 'Livros criados': 'Created books', 'Descobrir': 'Discover', 'Configurações': 'Settings', 'Perfil': 'Profile',
    'Entrar': 'Sign in', 'Sair': 'Sign out', 'Criar conta': 'Create account', 'Salvar perfil': 'Save profile', 'Perfil salvo.': 'Profile saved.',
    'Sua conta Readr': 'Your Readr account', 'Nome de exibição': 'Display name', 'Apelido público': 'Public nickname', 'Biografia': 'Bio',
    'Idioma do site': 'Site language', 'Português': 'Portuguese', 'Inglês': 'English', 'Espanhol': 'Spanish',
    'Buscar por livro ou autor...': 'Search by book or author...', 'Buscar livros': 'Search books', 'Navegação principal': 'Main navigation',
    'Boa leitura': 'Happy reading', 'Criar Novo Livro': 'Create New Book', 'Importar Livro': 'Import Book', 'Mais lidos': 'Most read', 'Ver mais': 'See more',
    'Meus Livros Criados': 'My Created Books', 'Ver todos': 'See all', 'Crie seus livros. Importe, personalize e leia do seu jeito com a melhor experiência de leitura.': 'Create your books. Import, customize and read your way with the best reading experience.',
    'Catálogo público': 'Public catalog', 'Encontre livros importados e histórias publicadas pela comunidade.': 'Find imported books and stories published by the community.',
    'Sua coleção pessoal': 'Your personal collection', 'Sua coleção, seus livros e seu progresso em um só lugar.': 'Your collection, books and progress in one place.',
    'Sua estante, seus livros e seu progresso ficam vinculados à sua conta.': 'Your shelf, books and progress stay linked to your account.',
    'Pesquisar título, autor ou editora': 'Search title, author or publisher', 'Filtros': 'Filters', 'Ordenar livros': 'Sort books', 'Mais recentes': 'Newest',
    'Título A–Z': 'Title A–Z', 'Título Z–A': 'Title Z–A', 'Melhor avaliados': 'Top rated', 'Gênero': 'Genre', 'Idioma': 'Language',
    'Origem': 'Source', 'Tamanho': 'Length', 'Avaliação': 'Rating', 'Todos': 'All', 'Livros autorais': 'Original books', 'Arquivos importados': 'Imported files',
    'Curtos — menos de 100 páginas': 'Short — under 100 pages', 'Médios — 100 a 300 páginas': 'Medium — 100 to 300 pages', 'Longos — mais de 300 páginas': 'Long — over 300 pages',
    '4 estrelas ou mais': '4 stars or more', '3 estrelas ou mais': '3 stars or more', 'Limpar filtros': 'Clear filters', 'Quero ler': 'Want to read', 'Lendo': 'Reading', 'Concluídos': 'Completed',
    'Nenhum livro encontrado': 'No books found', 'Nenhum livro nesta seção': 'No books in this section', 'Os livros aparecerão aqui conforme sua atividade.': 'Books will appear here as you use Readr.',
    'Autor não informado': 'Unknown author', 'leitores': 'readers', 'páginas': 'pages', 'Ler agora': 'Read now', 'Salvar para mais tarde': 'Save for later', 'Avaliações': 'Reviews',
    'Sua nota': 'Your rating', 'Conte o que achou...': 'Share your thoughts...', 'Publicar avaliação': 'Publish review', 'Ainda não há avaliações. Seja a primeira pessoa a avaliar.': 'No reviews yet. Be the first to review.',
    'Livro importado': 'Imported book', 'Configurar livro': 'Manage book', 'Excluir': 'Delete', 'Trocar capa': 'Change cover', 'Título': 'Title', 'Autor': 'Author', 'Descrição': 'Description',
    'Salvar alterações': 'Save changes', 'Importar': 'Import', 'Criar': 'Create', 'Novo capítulo': 'New chapter', 'Capítulos': 'Chapters', 'Publicar': 'Publish', 'Rascunho': 'Draft',
    'Preparando suas páginas…': 'Preparing your pages…', 'Tentar novamente': 'Try again', 'Página anterior': 'Previous page', 'Próxima página': 'Next page', 'Progresso de leitura': 'Reading progress', 'Progresso não salvo': 'Progress not saved',
    'E-mail ou apelido': 'Email or nickname', 'Senha': 'Password', 'Nome': 'Name', 'Apelido': 'Nickname', 'E-mail': 'Email', 'Criar conta e entrar': 'Create account and sign in',
    'Foto atualizada.': 'Photo updated.', 'Sua foto pode ser enviada diretamente para o bucket avatars.': 'Your photo is stored securely in your avatar storage.',
  },
  es: {
    'Início': 'Inicio', 'Biblioteca': 'Biblioteca', 'Minha Biblioteca': 'Mi Biblioteca', 'Minha estante': 'Mi estantería', 'Minha Estante': 'Mi Estantería',
    'Criados': 'Creados', 'Livros criados': 'Libros creados', 'Descobrir': 'Descubrir', 'Configurações': 'Configuración', 'Perfil': 'Perfil',
    'Entrar': 'Entrar', 'Sair': 'Salir', 'Criar conta': 'Crear cuenta', 'Salvar perfil': 'Guardar perfil', 'Perfil salvo.': 'Perfil guardado.',
    'Sua conta Readr': 'Tu cuenta Readr', 'Nome de exibição': 'Nombre visible', 'Apelido público': 'Apodo público', 'Biografia': 'Biografía',
    'Idioma do site': 'Idioma del sitio', 'Português': 'Portugués', 'Inglês': 'Inglés', 'Espanhol': 'Español',
    'Buscar por livro ou autor...': 'Buscar por libro o autor...', 'Buscar livros': 'Buscar libros', 'Navegação principal': 'Navegación principal',
    'Boa leitura': 'Buena lectura', 'Criar Novo Livro': 'Crear Nuevo Libro', 'Importar Livro': 'Importar Libro', 'Mais lidos': 'Más leídos', 'Ver mais': 'Ver más',
    'Meus Livros Criados': 'Mis Libros Creados', 'Ver todos': 'Ver todos', 'Crie seus livros. Importe, personalize e leia do seu jeito com a melhor experiência de leitura.': 'Crea tus libros. Importa, personaliza y lee a tu manera con la mejor experiencia de lectura.',
    'Catálogo público': 'Catálogo público', 'Encontre livros importados e histórias publicadas pela comunidade.': 'Encuentra libros importados e historias publicadas por la comunidad.',
    'Sua coleção pessoal': 'Tu colección personal', 'Sua estante, seus livros e seu progresso ficam vinculados à sua conta.': 'Tu estantería, libros y progreso permanecen vinculados a tu cuenta.',
    'Pesquisar título, autor ou editora': 'Buscar título, autor o editorial', 'Filtros': 'Filtros', 'Ordenar livros': 'Ordenar libros', 'Mais recentes': 'Más recientes',
    'Título A–Z': 'Título A–Z', 'Título Z–A': 'Título Z–A', 'Melhor avaliados': 'Mejor valorados', 'Gênero': 'Género', 'Idioma': 'Idioma', 'Origem': 'Origen', 'Tamanho': 'Tamaño', 'Avaliação': 'Valoración',
    'Todos': 'Todos', 'Livros autorais': 'Libros originales', 'Arquivos importados': 'Archivos importados', 'Curtos — menos de 100 páginas': 'Cortos — menos de 100 páginas',
    'Médios — 100 a 300 páginas': 'Medianos — 100 a 300 páginas', 'Longos — mais de 300 páginas': 'Largos — más de 300 páginas', '4 estrelas ou mais': '4 estrellas o más', '3 estrelas ou mais': '3 estrellas o más',
    'Limpar filtros': 'Limpiar filtros', 'Quero ler': 'Quiero leer', 'Lendo': 'Leyendo', 'Concluídos': 'Completados', 'Nenhum livro encontrado': 'No se encontraron libros', 'Nenhum livro nesta seção': 'No hay libros en esta sección',
    'Os livros aparecerão aqui conforme sua atividade.': 'Los libros aparecerán aquí según tu actividad.', 'Autor não informado': 'Autor no informado', 'leitores': 'lectores', 'páginas': 'páginas',
    'Ler agora': 'Leer ahora', 'Salvar para mais tarde': 'Guardar para después', 'Avaliações': 'Reseñas', 'Sua nota': 'Tu puntuación', 'Conte o que achou...': 'Cuéntanos qué te pareció...',
    'Publicar avaliação': 'Publicar reseña', 'Ainda não há avaliações. Seja a primeira pessoa a avaliar.': 'Aún no hay reseñas. Sé la primera persona en opinar.',
    'Livro importado': 'Libro importado', 'Configurar livro': 'Configurar libro', 'Excluir': 'Eliminar', 'Trocar capa': 'Cambiar portada', 'Título': 'Título', 'Autor': 'Autor', 'Descrição': 'Descripción',
    'Salvar alterações': 'Guardar cambios', 'Importar': 'Importar', 'Criar': 'Crear', 'Novo capítulo': 'Nuevo capítulo', 'Capítulos': 'Capítulos', 'Publicar': 'Publicar', 'Rascunho': 'Borrador',
    'Preparando suas páginas…': 'Preparando tus páginas…', 'Tentar novamente': 'Intentar de nuevo', 'Página anterior': 'Página anterior', 'Próxima página': 'Página siguiente', 'Progresso de leitura': 'Progreso de lectura', 'Progresso não salvo': 'Progreso no guardado',
    'E-mail ou apelido': 'Correo o apodo', 'Senha': 'Contraseña', 'Nome': 'Nombre', 'Apelido': 'Apodo', 'E-mail': 'Correo', 'Criar conta e entrar': 'Crear cuenta y entrar',
    'Foto atualizada.': 'Foto actualizada.', 'Sua foto pode ser enviada diretamente para o bucket avatars.': 'Tu foto se guarda de forma segura en el almacenamiento de avatares.',
  },
}

const LanguageContext = createContext<{ language: AppLanguage; setLanguage: (language: AppLanguage) => void; t: (text: string) => string }>({ language: 'pt', setLanguage: () => undefined, t: (text) => text })

function translateText(value: string, language: AppLanguage) {
  if (language === 'pt') return value
  const exact = translations[language][value]
  if (exact) return exact
  let translated = value
  Object.entries(translations[language]).sort(([a], [b]) => b.length - a.length).forEach(([from, to]) => {
    translated = translated.replaceAll(from, to)
  })
  return translated
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('pt')
  const setLanguage = useCallback((next: AppLanguage) => {
    localStorage.setItem('readr-language', next)
    setLanguageState(next)
    window.location.reload()
  }, [])
  const t = useCallback((text: string) => translateText(text, language), [language])

  useEffect(() => {
    const saved = localStorage.getItem('readr-language') as AppLanguage | null
    if (saved === 'pt' || saved === 'en' || saved === 'es') setLanguageState(saved)
  }, [])

  useEffect(() => {
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : language
    document.documentElement.dataset.language = language
    if (language === 'pt') return

    const translateNode = (root: Node) => {
      const visit = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
          node.textContent = translateText(node.textContent, language)
          return
        }
        if (!(node instanceof HTMLElement) || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) return
        for (const attribute of ['placeholder', 'aria-label', 'title']) {
          const current = node.getAttribute(attribute)
          if (current) node.setAttribute(attribute, translateText(current, language))
        }
        node.childNodes.forEach(visit)
      }
      visit(root)
    }

    translateNode(document.body)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => mutation.addedNodes.forEach(translateNode))
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [language])

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
