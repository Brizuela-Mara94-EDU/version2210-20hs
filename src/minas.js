import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.querySelector("#start-button");
    const arContainer = document.querySelector("#ar-container");

    // ==========================================================
    // Datos de los modelos con los nombres de archivo correctos
    // ==========================================================
    const engineeringData = [
        { 
            name: "Mina a Cielo Abierto", 
            file: "minaAcieloAbierto.glb",
            scale: 0.1, 
            description: "Método de explotación donde se extraen minerales desde un gran rajo superficial. Los bancos y rampas forman una estructura escalonada." 
        },
        { 
            name: "Mina Industrial", 
            file: "minaIndustrial.glb",
            scale: 0.05, 
            description: "Mina industrial subterránea que utiliza túneles y cámaras para acceder a los depósitos minerales profundos." 
        },
        { 
            name: "Mina Subterránea", 
            file: "minaSubterranea.glb",
            scale: 0.1, 
            description: "Mina subterránea que emplea métodos como el corte y relleno, o el hundimiento por bloques para extraer minerales." 
        },
        { 
            name: "Mina a cielo Abierto con Equipos", 
            file: "minaacieloabierto2.glb",
            scale: 0.1, 
            description: "Mina a cielo abierto vista desde otro ángulo, mostrando maquinaria pesada utilizada en la extracción." 
        }
    ];
    // ==========================================================

    let currentModel = null; // Variable para saber qué modelo está visible

    const startAR = async () => {
        document.querySelector(".ui-overlay").style.display = "none";
        arContainer.style.display = "block";
        document.querySelector("#scanning-ui").classList.remove("hidden");

        const mindarThree = new MindARThree({
            container: arContainer,
            imageTargetSrc: `${import.meta.env.BASE_URL}mind/minas-targets.mind`,
        });

        const { renderer, scene, camera } = mindarThree;
        const loader = new GLTFLoader();

        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7.5);
        scene.add(dirLight);

        const anchors = engineeringData.map((data, index) => {
            const anchor = mindarThree.addAnchor(index);
            
            // CORREGIDO: Ruta sin la carpeta "minas", como tú lo tienes.
            loader.load(`${import.meta.env.BASE_URL}models/${data.file}`, (gltf) => {
                const model = gltf.scene;
                model.scale.set(data.scale, data.scale, data.scale);
                model.position.set(0, -0.2, 0);
                anchor.group.add(model);
            });

            anchor.onTargetFound = () => {
                document.querySelector("#scanning-ui").classList.add("hidden");
                currentModel = anchor.group; 
                showInfo(data);
            };

            anchor.onTargetLost = () => {
                currentModel = null;
                if (!document.querySelector(".ui-overlay").style.display === "none") {
                   document.querySelector("#scanning-ui").classList.remove("hidden");
                }
                hideInfo();
            };

            return anchor;
        });

        const infoPanel = document.querySelector("#info-panel");
        const infoName = document.querySelector("#info-name");
        const infoDescription = document.querySelector("#info-description");
        const closeBtn = document.querySelector("#close-info-btn");

        const showInfo = (data) => {
            infoName.textContent = data.name;
            infoDescription.textContent = data.description;
            infoPanel.classList.remove("hidden");
        };

        const hideInfo = () => {
            infoPanel.classList.add("hidden");
        };

        closeBtn.addEventListener("click", hideInfo);

        // ========= INICIO: LÓGICA DE CONTROL TÁCTIL =========
        let touchStartX = 0;
        let isDragging = false;

        arContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                touchStartX = e.touches[0].clientX;
            }
        });

        arContainer.addEventListener('touchend', () => {
            isDragging = false;
        });

        arContainer.addEventListener('touchmove', (e) => {
            e.preventDefault(); 
            if (isDragging && currentModel && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - touchStartX;
                currentModel.rotation.y += deltaX * 0.01;
                touchStartX = e.touches[0].clientX;
            }
        }, { passive: false });
        // ========= FIN: LÓGICA DE CONTROL TÁCTIL =========

        await mindarThree.start();

        renderer.setAnimationLoop(() => {
            renderer.render(scene, camera);
        });
    };

    startButton.addEventListener("click", startAR);
});