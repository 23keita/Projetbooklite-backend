import React from "react";

interface DownloadButtonProps {
    orderId: string;
    productId: string;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ orderId, productId }) => {
    const handleDownload = async () => {
        try {
            const res = await fetch(
                `http://localhost:5000/api/download/${orderId}/${productId}`
            );
            const data = await res.json();

            if (!data.success) {
                throw new Error("Fichier introuvable");
            }

            // Créer un lien temporaire pour télécharger
            const link = document.createElement("a");
            link.href = data.downloadUrl;
            link.download = data.downloadUrl.split("/").pop() || "fichier.zip";
            link.click();
        } catch (err) {
            console.error(err);
            alert("Impossible de télécharger le fichier");
        }
    };

    return (
        <button
            onClick={handleDownload}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
        >
            Télécharger
        </button>
    );
};

export default DownloadButton;
