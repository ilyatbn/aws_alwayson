// Extract the "subdomain" query parameter
const params = new URLSearchParams(window.location.search);
const subdomain = params.get("subdomain");

if (subdomain) {
    // Construct the target URL
    const targetUrl = `https://${subdomain}.awsapps.com/start/`;

    // Create an iframe
    const iframe = document.createElement("iframe");
    iframe.src = targetUrl;
    iframe.onload = () => console.log(`Iframe loaded: ${iframe.src}`);
    iframe.onerror = () => console.error(`Error loading iframe: ${iframe.src}`);

    document.body.appendChild(iframe);
} else {
    console.error("Subdomain query parameter is missing.");
}
