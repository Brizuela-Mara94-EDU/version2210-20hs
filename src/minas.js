import * as THREE from 'three';
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.querySelector("#start-button");
    const arContainer = document.querySelector("#ar-container");
    
    // Datos de los 6 modelos actualizados en el orden correcto
    const modelData = [
        { 
            name: "Camión Volquete", 
            file: "camionamarilloTelone.glb",
            scale: 0.035,
            description: "Camión volquete de gran capacidad utilizado para el transporte de material estéril y mineral dentro de la mina." 
        },
        { 
            name: "Excavadora Hidráulica", 
            file: "renderamarillo.glb",
            scale: 0.035,
            description: "Maquinaria pesada esencial para la carga de material en camiones. Su brazo hidráulico permite excavar y mover grandes volúmenes de tierra y roca." 
        },
        { 
            name: "Formación Geológica", 
            file: "openpitmine.glb",
            scale: 0.035,
            description: "Modelo de elevación digital que muestra una estructura geológica compleja, como un domo o anticlinal, con capas de roca plegadas y expuestas." 
        },
        { 
            name: "Mina a Cielo Abierto", 
            file: "minaacieloabierto.glb",
            scale: 0.035,
            description: "Modelo 3D de una mina a cielo abierto. Este método extrae minerales desde un rajo superficial, creando bancos o terrazas escalonadas para la operación." 
        },
        {
            name: "Lapislázuli",
            file: "lapislazuli.glb",
            scale: 0.05, // Escala un poco mayor para un objeto pequeño
            description: "Muestra de Lapislázuli, una roca semipreciosa conocida por su intenso color azul, compuesta por lazurita, calcita y pirita."
        },
        {
            name: "Wolframita",
            file: "wolframita.glb",
            scale: 0.05, // Escala un poco mayor para un objeto pequeño
            description: "Espécimen de Wolframita, un mineral de tungsteno de color negro o gris oscuro con un característico brillo submetálico."
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

        // Luz ambiental mejorada y dos direccionales para mejor visibilidad
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const dirLight1 = new THREE.DirectionalLight(0xfffbe0, 0.9);
        dirLight1.position.set(2, 3, 2);
        scene.add(dirLight1);
        const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight2.position.set(-2, 2, -2);
        scene.add(dirLight2);

        const anchors = modelData.map((data, index) => {
            const anchor = mindarThree.addAnchor(index);

            loader.load(`${import.meta.env.BASE_URL}models/${data.file}`, (gltf) => {
                const model = gltf.scene;
                model.scale.set(data.scale, data.scale, data.scale);
                model.position.set(0, 0, 0);
                anchor.group.add(model);
                anchor.modelMain = model; // Guardamos referencia al modelo principal
            });

            anchor.onTargetFound = () => {
                document.querySelector("#scanning-ui").classList.add("hidden");
                currentModel = anchor.group;
                // Asignamos el modelo principal para la interacción
                modelToRotate = anchor.modelMain;
                showInfo(modelData[index]);
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

        // Interacción táctil: rotación con un dedo, zoom con dos dedos
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
                    let newScale = Math.max(0.01, Math.min(0.1, initialScale * scaleFactor)); // Límites de zoom ajustados
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