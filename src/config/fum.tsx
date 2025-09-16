import React, { useState } from "react";

interface UploadFormProps {
    productId: string;
}

const UploadForm: React.FC<UploadFormProps> = ({ productId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return alert("Veuillez sélectionner un fichier");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`http://localhost:5000/api/upload/${productId}`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setMessage("Fichier uploadé avec succès !");
            } else {
                setMessage("Erreur lors de l'upload");
            }
        } catch (err) {
            console.error(err);
            setMessage("Erreur serveur");
        }
    };

    return (
        <div className="p-4 border rounded shadow-md w-full max-w-md">
            <input type="file" onChange={handleChange} className="mb-2" />
            <button
                onClick={handleUpload}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded"
            >
                Upload
            </button>
            {message && <p className="mt-2">{message}</p>}
        </div>
    );
};

export default UploadForm;
