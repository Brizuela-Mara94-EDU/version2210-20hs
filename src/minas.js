import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.querySelector("#start-button");
    const arContainer = document.querySelector("#ar-container");
    
    // Datos de modelos, ajusta 'scale' para que no sean demasiado grandes
    const engineeringData = [
        { 
            name: "Mina a Cielo Abierto", 
            file: "minaAcieloAbierto.glb",
            scale: 0.035,
            description: "Método de explotación donde se extraen minerales desde un gran rajo superficial. Los bancos y rampas forman una estructura escalonada." 
        },
        { 
            name: "Mina Industrial", 
            file: "minaIndustrial.glb",
            scale: 0.03,
            description: "Mina industrial subterránea que utiliza túneles y cámaras para acceder a los depósitos minerales profundos." 
        },
        { 
            name: "Mina Subterránea", 
            file: "minaSubterranea.glb",
            scale: 0.035,
            description: "Mina subterránea que emplea métodos como el corte y relleno, o el hundimiento por bloques para extraer minerales." 
        },
        { 
            name: "Mina a cielo Abierto con Equipos", 
            file: "minaacieloabierto2.glb",
            scale: 0.035,
            description: "Mina a cielo abierto vista desde otro ángulo, mostrando maquinaria pesada utilizada en la extracción." 
        }
    ];

    let currentModel = null;
    let modelToRotate = null;
    let isDragging = false;
    let touchStartX = 0;
    let initialDistance = null;
    let initialScale = null;

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

        // Luz ambiental mejorada y dos direccionales para mejor visibilidad desde cualquier ángulo
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const dirLight1 = new THREE.DirectionalLight(0xfffbe0, 0.9);
        dirLight1.position.set(2, 3, 2);
        scene.add(dirLight1);
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight2.position.set(-2, 2, -2);
        scene.add(dirLight2);

        const anchors = engineeringData.map((data, index) => {
            const anchor = mindarThree.addAnchor(index);

            loader.load(`${import.meta.env.BASE_URL}models/${data.file}`, (gltf) => {
                const model = gltf.scene;
                model.scale.set(data.scale, data.scale, data.scale);
                model.position.set(0, 0, 0);
                anchor.group.add(model);
                anchor.modelMain = model;
            });

            anchor.onTargetFound = () => {
                document.querySelector("#scanning-ui").classList.add("hidden");
                currentModel = anchor.group;
                // Selecciona el nodo para interacción
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
                document.querySelector("#scanning-ui").classList.remove("hidden");
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

        // Mejor interacción táctil: rotación con un dedo, zoom con dos dedos
        arContainer.addEventListener('touchstart', (e) => {
            if (modelToRotate) {
                if (e.touches.length === 1) {
                    isDragging = true;
                    touchStartX = e.touches[0].clientX;
                }
                if (e.touches.length === 2) {
                    initialDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    initialScale = modelToRotate.scale.x;
                }
            }
        });

        arContainer.addEventListener('touchend', () => {
            isDragging = false;
            initialDistance = null;
        });

        arContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (modelToRotate) {
                if (isDragging && e.touches.length === 1) {
                    const deltaX = e.touches[0].clientX - touchStartX;
                    modelToRotate.rotation.y += deltaX * 0.01;
                    touchStartX = e.touches[0].clientX;
                }
                if (e.touches.length === 2 && initialDistance) {
                    const currentDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    let scaleFactor = currentDistance / initialDistance;
                    let newScale = Math.max(0.015, Math.min(0.08, initialScale * scaleFactor));
                    modelToRotate.scale.set(newScale, newScale, newScale);
                }
            }
        }, { passive: false });

        await mindarThree.start();

        renderer.setAnimationLoop(() => {
            renderer.render(scene, camera);
            // Rotación automática cuando no se está tocando
            if (modelToRotate && !isDragging) {
                modelToRotate.rotation.y += 0.005;
            }
        });
    };

    startButton.addEventListener("click", startAR);
});