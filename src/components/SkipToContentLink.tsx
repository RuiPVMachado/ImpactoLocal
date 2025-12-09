// High-contrast skip link that lets keyboard users jump to the main region.

/**
 * A hidden link that becomes visible on focus, allowing keyboard users to skip navigation.
 * It targets the element with id "principal".
 */
export default function SkipToContentLink() {
  return (
    <a href="#principal" className="skip-link">
      Saltar para o conteúdo principal
    </a>
  );
}
