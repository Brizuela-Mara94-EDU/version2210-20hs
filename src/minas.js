import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.querySelector("#start-button");
    const arContainer = document.querySelector("#ar-container");

    // Revisa y ajusta la escala y posición de cada modelo aquí si alguno se ve demasiado grande o fuera de lugar
    const engineeringData = [
        { 
            name: "Mina a Cielo Abierto", 
            file: "minaAcieloAbierto.glb",
            scale: 0.05, // Más pequeño que antes
            position: [0, 0, 0], // Centrado
            description: "Método de explotación donde se extraen minerales desde un gran rajo superficial. Los bancos y rampas forman una estructura escalonada." 
        },
        { 
            name: "Mina Industrial", 
            file: "minaIndustrial.glb",
            scale: 0.04, // Más pequeño
            position: [0, 0, 0], // Centrado
            description: "Mina industrial subterránea que utiliza túneles y cámaras para acceder a los depósitos minerales profundos." 
        },
        { 
            name: "Mina Subterránea", 
            file: "minaSubterranea.glb",
            scale: 0.05,
            position: [0, 0, 0], // Centrado
            description: "Mina subterránea que emplea métodos como el corte y relleno, o el hundimiento por bloques para extraer minerales." 
        },
        { 
            name: "Mina a cielo Abierto con Equipos", 
            file: "minaacieloabierto2.glb",
            scale: 0.05,
            position: [0, 0, 0], // Centrado
            description: "Mina a cielo abierto vista desde otro ángulo, mostrando maquinaria pesada utilizada en la extracción." 
        }
    ];

    let currentModel = null; // Referencia al modelo visible
    let modelToRotate = null; // Referencia al nodo que vamos a rotar (puede ser hijo)

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
            
            loader.load(`${import.meta.env.BASE_URL}models/${data.file}`, (gltf) => {
                const model = gltf.scene;
                model.scale.set(data.scale, data.scale, data.scale);
                model.position.set(...data.position);
                anchor.group.add(model);
                // Guardamos referencia al modelo principal, pero también al hijo si existe
                anchor.modelMain = model;
            });

            anchor.onTargetFound = () => {
                document.querySelector("#scanning-ui").classList.add("hidden");
                currentModel = anchor.group;

                // Buscamos el nodo correcto para rotar
                // Si el modelo tiene hijos, rotamos el primero; si no, rotamos el principal
                if (anchor.modelMain && anchor.modelMain.children.length > 0) {
                    modelToRotate = anchor.modelMain.children[0];
                } else if (anchor.modelMain) {
                    modelToRotate = anchor.modelMain;
                } else {
                    modelToRotate = null;
                }

                showInfo(engineeringData[index]);
            };

            anchor.onTargetLost = () => {
                currentModel = null;
                modelToRotate = null;
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

        // ========= INICIO: LÓGICA DE CONTROL TÁCTIL MEJORADA =========
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
            if (isDragging && modelToRotate && e.touches.length === 1) {
                const deltaX = e.touches[0].clientX - touchStartX;
                modelToRotate.rotation.y += deltaX * 0.01;
                touchStartX = e.touches[0].clientX;
            }
        }, { passive: false });
        // ========= FIN: LÓGICA DE CONTROL TÁCTIL MEJORADA =========

        await mindarThree.start();

        renderer.setAnimationLoop(() => {
            renderer.render(scene, camera);
        });
    };

    startButton.addEventListener("click", startAR);
});