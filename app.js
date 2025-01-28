// ? Liste des classes CIFAR-10
const cifar10_labels = [
    "airplane", "automobile", "bird", "cat", "deer",
    "dog", "frog", "horse", "ship", "truck"
];

// ? Sélection des éléments HTML
const imageUpload = document.getElementById("imageUpload");
const predictButton = document.getElementById("predictButton");
const preview = document.getElementById("preview");
const predictionResult = document.getElementById("predictionResult");
const useCamButton = document.getElementById("useCamButton");
const video = document.getElementById("video");
const captureButton = document.getElementById("captureButton");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ? Charger le modèle ONNX
let session = null;
(async function loadModel() {
    try {
        console.log("Chargement du modèle ONNX...");
        session = await ort.InferenceSession.create("model/model_cifar.onnx");
        console.log("Modèle ONNX chargé !");

        // Vérifions les noms d'entrées/sorties du modèle :
        console.log("session.inputNames =", session.inputNames);
        console.log("session.outputNames =", session.outputNames);

    } catch (err) {
        console.error("Erreur lors du chargement du modèle :", err);
    }
})();

// ? Gestion de l'upload d'image
imageUpload.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // Afficher l'image sélectionnée
    const reader = new FileReader();
    reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = "block";
    };
    reader.readAsDataURL(file);
});

// ? Fonction pour redimensionner l'image en 32x32 et la convertir en Tensor
function preprocessImage(imageElement) {
    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 32;
        canvas.height = 32;

        // Dessiner l'image redimensionnée sur le canvas
        ctx.drawImage(imageElement, 0, 0, 32, 32);

        // Récupérer les pixels
        const imageData = ctx.getImageData(0, 0, 32, 32).data;
        const float32Data = new Float32Array(3 * 32 * 32);

        // Convertir en format Tensor (normalisation 0-1)
        for (let i = 0; i < 32 * 32; i++) {
            float32Data[i] = imageData[i * 4] / 255;       // Rouge
            float32Data[i + 32 * 32] = imageData[i * 4 + 1] / 255;  // Vert
            float32Data[i + 2 * 32 * 32] = imageData[i * 4 + 2] / 255;  // Bleu
        }

        // Créer un Tensor compatible ONNX (N, C, H, W)
        const inputTensor = new ort.Tensor("float32", float32Data, [1, 3, 32, 32]);
        resolve(inputTensor);
    });
}

// ? Bouton "Use Cam"
useCamButton.addEventListener("click", async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = "block";
        captureButton.style.display = "inline-block";
    } catch (error) {
        console.error("Erreur lors de l'accès à la webcam :", error);
        alert("Impossible d'accéder à la caméra. Vérifiez les autorisations.");
    }
});

// ? Bouton "Capture"
captureButton.addEventListener("click", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const largeDataURL = canvas.toDataURL("image/png");
    preview.src = largeDataURL;
    preview.style.display = "block";

    const hiddenCanvas = document.createElement("canvas");
    hiddenCanvas.width = 32;
    hiddenCanvas.height = 32;
    const hiddenCtx = hiddenCanvas.getContext("2d");

    hiddenCtx.drawImage(video, 0, 0, 32, 32);
});

// ? Gestion du clic sur le bouton "Prédire"
predictButton.addEventListener("click", async function () {
    if (!preview.src || !session) {
        alert("Veuillez charger une image et attendre le chargement du modèle !");
        return;
    }
    console.log("here")

    const inputTensor = await preprocessImage(preview);

    const outputs = await session.run({ input: inputTensor });

    const outputData = outputs["output"].data;
    const predictedIndex = outputData.indexOf(Math.max(...outputData));

    predictionResult.innerHTML = `Résultat : <span>${cifar10_labels[predictedIndex]}</span>`;
});
