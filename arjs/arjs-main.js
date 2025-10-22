// ========== AR.js Main - Sistema de barcode markers 3x3 ==========
// Este archivo está completamente separado de MindAR para evitar conflictos

let arToolkitSource = null;
let arToolkitContext = null;
let markerRoot = null;
let scene = null;
let camera = null;
let renderer = null;
let isRunning = false;
let model3D = null;

// Variables para controles táctiles
let isDragging = false;
let lastTouchX = 0;
let lastTouchY = 0;
let lastPinchDist = 0;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5.0;

window.startScanner = async () => {
  if (isRunning) {
    await stopAR();
  }

  // Obtener parámetros de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const markerType = urlParams.get('marker') || 'casco';
  const machineName = urlParams.get('name') || 'Maquinaria';
  
  // Elementos del DOM
  const modelNameEl = document.getElementById('modelName');
  const statusTextEl = document.getElementById('statusText');
  const loadingEl = document.getElementById('loading');
  const modelInfoEl = document.getElementById('modelInfo');
  
  if (modelNameEl) {
    modelNameEl.textContent = machineName;
  }
  
  function updateStatus(message) {
    if (statusTextEl) {
      statusTextEl.textContent = message;
    }
  }
  
  function showError(message) {
    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <h3>⚠️ Error</h3>
      <p>${message}</p>
      <button class="close-btn" style="margin-top: 10px; padding: 10px 20px; cursor: pointer;" onclick="window.history.back()">Volver</button>
    `;
    document.body.appendChild(errorDiv);
  }

  try {
    console.log('🚀 Iniciando AR.js Scanner...');
    updateStatus('Verificando AR.js...');

    // Esperar a que THREEx se cargue
    let attempts = 0;
    while (typeof THREEx === 'undefined' && attempts < 100) {
      console.log('⏳ Esperando AR.js... intento', attempts + 1);
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof THREEx === 'undefined' || typeof THREEx.ArToolkitSource === 'undefined') {
      throw new Error('AR.js no se cargó correctamente');
    }
    
    console.log('✅ AR.js disponible');

    // Mapeo de marcadores a barcode IDs (matriz 3x3)
    const barcodeMapping = {
      casco: 20,
      pico: 21,
      truck: 22,
      tunel: 23,
      garras: 24,
      perforadora: 25,
      camion: 26,
      oro: 27,
      wolframita: 28,
      renderamarillo: 32
    };

    // Mapeo de marcadores a modelos 3D
    const modelMapping = {
      casco: { path: 'lamp.glb', scale: 0.5, rotation: { x: 0, y: 0, z: 0 } },
      pico: { path: 'pico.glb', scale: 0.5, rotation: { x: 0, y: 0, z: 0 } },
      truck: { path: 'truck.glb', scale: 1.5, rotation: { x: 0, y: 0, z: 0 } },
      tunel: { path: 'tunel.glb', scale: 0.5, rotation: { x: 0, y: 0, z: 0 } },
      garras: { path: 'garras.glb', scale: 1.5, rotation: { x: 0, y: 0, z: 0 } },
      perforadora: { path: 'perforadora.glb', scale: 1.5, rotation: { x: 0, y: 0, z: 0 } },
      camion: { path: 'carga.glb', scale: 1.5, rotation: { x: 0, y: 0, z: 0 } },
      oro: { path: 'oro.glb', scale: 0.3, rotation: { x: 0, y: 0, z: 0 } },
      wolframita: { path: 'wolframita.glb', scale: 0.3, rotation: { x: 0, y: 0, z: 0 } },
      renderamarillo: { path: 'renderamarillo.glb', scale: 0.4, rotation: { x: 0, y: 0, z: 0 } }
    };

    const barcodeValue = barcodeMapping[markerType];
    const modelConfig = modelMapping[markerType] || { path: 'lamp.glb', scale: 0.5, rotation: { x: 0, y: 0, z: 0 } };

    if (barcodeValue === undefined) {
      throw new Error(`Marcador "${markerType}" no encontrado`);
    }

    console.log(`📦 Configuración: Barcode ${barcodeValue} -> ${modelConfig.path}`);
    updateStatus(`Configurando barcode ${barcodeValue}...`);

    // Limpiar container
    const container = document.querySelector('#ar-container');
    if (container) container.innerHTML = '';

    // Configurar THREE.js
    scene = new THREE.Scene();
    camera = new THREE.Camera();
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      preserveDrawingBuffer: true  // Para capturas de pantalla
    });
    renderer.setClearColor(new THREE.Color('lightgrey'), 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '1';
    
    if (container) {
      container.appendChild(renderer.domElement);
    }

    updateStatus('Solicitando acceso a la cámara...');

    // Configurar fuente de video (webcam)
    arToolkitSource = new THREEx.ArToolkitSource({ 
      sourceType: 'webcam',
      sourceWidth: window.innerWidth > 640 ? 1280 : 640,
      sourceHeight: window.innerHeight > 480 ? 960 : 480,
      displayWidth: window.innerWidth,
      displayHeight: window.innerHeight
    });

    function onResize() {
      try {
        arToolkitSource.onResizeElement();
        arToolkitSource.copyElementSizeTo(renderer.domElement);
        if (arToolkitContext && arToolkitContext.arController) {
          arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
        }
      } catch (e) {
        console.warn('⚠️ Resize error:', e);
      }
    }

    // Inicializar cámara
    await new Promise((resolve, reject) => {
      arToolkitSource.init(function onReady() {
        console.log('✅ Cámara lista');
        updateStatus('Cámara lista, configurando detección...');
        setTimeout(() => {
          onResize();
          const video = arToolkitSource.domElement;
          if (video) {
            video.style.position = 'absolute';
            video.style.top = '50%';
            video.style.left = '50%';
            video.style.transform = 'translate(-50%, -50%)';
            video.style.minWidth = '100%';
            video.style.minHeight = '100%';
            video.style.width = 'auto';
            video.style.height = 'auto';
            video.style.objectFit = 'cover';
            console.log('📹 Video configurado:', video.videoWidth, 'x', video.videoHeight);
          }
        }, 100);
        resolve();
      }, function onError(error) {
        console.error('❌ Error al iniciar cámara:', error);
        reject(error);
      });
    });

    window.addEventListener('resize', () => {
      onResize();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Configurar contexto AR con matriz 3x3
    arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl: 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js/data/data/camera_para.dat',
      detectionMode: 'mono',
      matrixCodeType: '3x3',
      labelingMode: 'black_region',
      patternRatio: 0.5,
      imageSmoothingEnabled: false,
      maxDetectionRate: 30,
      canvasWidth: 640,
      canvasHeight: 480,
      thresholdMode: 'manual',
      thresholdValue: 100
    });

    await new Promise((resolve) => {
      arToolkitContext.init(function onCompleted() {
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
        console.log('✅ Contexto AR configurado');
        updateStatus('Sistema AR listo. Buscando marcador...');
        resolve();
      });
    });

    // Crear grupo para el marcador
    markerRoot = new THREE.Group();
    scene.add(markerRoot);

    // Configurar controles del marcador (barcode 3x3)
    const markerControls = new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
      type: 'barcode',
      barcodeValue: barcodeValue,
      changeMatrixMode: 'cameraTransformMatrix',
      smooth: true,
      smoothCount: 5,
      smoothTolerance: 0.01,
      smoothThreshold: 2
    });

    console.log(`🎯 Marcador barcode ${barcodeValue} configurado`);

    updateStatus('Cargando modelo 3D...');

    // --------- ADAPTACIÓN PARA ARCHIVOS ESTÁTICOS ----------
    // Usar window.BASE_URL (seteado por las páginas scanner/arjs-scanner)
    const baseUrl = (window.BASE_URL !== undefined) ? window.BASE_URL : '';
    // Modelos estarán en public/arjs/models -> ruta pública: <BASE_URL>arjs/models/...
    const modelPath = `${baseUrl}arjs/models/${modelConfig.path}`;
    console.log('📦 Cargando modelo:', modelPath);
    // ------------------------------------------------------

    try {
      const loader = new THREE.GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        loader.load(
          modelPath,
          (gltf) => {
            console.log('✅ Modelo cargado:', modelPath);
            resolve(gltf);
          },
          (xhr) => {
            const percent = (xhr.loaded / xhr.total) * 100;
            updateStatus(`Cargando modelo ${percent.toFixed(0)}%`);
          },
          (error) => {
            console.warn('⚠️ Error cargando modelo:', error);
            reject(error);
          }
        );
      });

      model3D = gltf.scene;
      model3D.scale.set(modelConfig.scale, modelConfig.scale, modelConfig.scale);
      if (modelConfig.rotation) {
        model3D.rotation.set(modelConfig.rotation.x, modelConfig.rotation.y, modelConfig.rotation.z);
      }
      model3D.position.y = modelConfig.scale / 2;
      model3D.visible = true;
      markerRoot.add(model3D);
      console.log('✅ Modelo añadido a la escena');
      
    } catch (err) {
      console.warn('⚠️ Usando cubo de prueba');
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material = new THREE.MeshPhongMaterial({ color: 0xd81e27, shininess: 100 });
      model3D = new THREE.Mesh(geometry, material);
      model3D.position.y = 0.25;
      model3D.visible = true;
      markerRoot.add(model3D);
    }

    // ... resto del archivo sin cambios ...
    // (mantener el resto tal cual; no hace falta tocar los handlers/controls)
    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);

    if (loadingEl) {
      loadingEl.classList.add('hidden');
    }

    updateStatus('Buscando marcador...');
    setupTouchControls();
    createCaptureButton();

    // Loop de animación (mantener código existente)
    isRunning = true;
    let prevVisible = false;
    let detectionCount = 0;
    let frameCount = 0;
    let lastDebugTime = Date.now();
    let consecutiveDetections = 0;
    const REQUIRED_DETECTIONS = 3;
    let confirmedVisible = false;

    function animate() {
      if (!isRunning) return;
      requestAnimationFrame(animate);
      frameCount++;
      if (arToolkitSource && arToolkitSource.ready !== false) {
        try {
          arToolkitContext.update(arToolkitSource.domElement);
          const now = Date.now();
          if (now - lastDebugTime > 2000) {
            lastDebugTime = now;
            if (arToolkitContext.arController) {
              const detectedMarkers = arToolkitContext.arController.getMarkerNum();
              console.log('🔍 Debug AR:', {
                buscando: `Barcode ${barcodeValue}`,
                markerVisible: markerRoot.visible,
                marcadoresDetectados: detectedMarkers,
                videoReady: arToolkitSource.ready,
                canvasSize: `${arToolkitContext.arController.canvas.width}x${arToolkitContext.arController.canvas.height}`
              });
            }
          }
        } catch (e) {
          if (frameCount % 120 === 0) console.warn('⚠️ Error en update:', e.message);
        }
      }
      renderer.render(scene, camera);
      const visible = markerRoot.visible;
      let isValidDetection = false;
      let currentConfidence = 0;
      if (visible && arToolkitContext.arController) {
        try {
          const detectedMarkers = arToolkitContext.arController.getMarkerNum();
          for (let i = 0; i < detectedMarkers; i++) {
            const marker = arToolkitContext.arController.getMarker(i);
            if (marker && marker.idPatt === barcodeValue) {
              currentConfidence = marker.cfPatt;
              if (marker.cfPatt >= 0.4) isValidDetection = true;
              break;
            }
          }
        } catch (e) {}
      }
      if (isValidDetection) {
        consecutiveDetections++;
      } else {
        consecutiveDetections = 0;
      }
      const shouldBeVisible = consecutiveDetections >= REQUIRED_DETECTIONS;
      if (shouldBeVisible !== confirmedVisible) {
        confirmedVisible = shouldBeVisible;
        if (shouldBeVisible) {
          detectionCount++;
          updateStatus(`Barcode ${barcodeValue} detectado ✓`);
          if (modelInfoEl) modelInfoEl.classList.add('active');
          const captureBtn = document.getElementById('captureBtn');
          if (captureBtn) captureBtn.style.display = 'flex';
        } else {
          updateStatus(`Buscando barcode ${barcodeValue}...`);
          if (modelInfoEl) modelInfoEl.classList.remove('active');
        }
      }
      if (model3D) model3D.visible = confirmedVisible;
    }

    animate();
    console.log('🎉 AR.js Scanner iniciado correctamente');

  } catch (error) {
    console.error('❌ Error al inicializar AR.js:', error);
    let errorMsg = 'No se pudo inicializar la realidad aumentada. ';
    if (error.name === 'NotAllowedError') errorMsg += 'Has denegado el permiso de cámara.';
    else if (error.name === 'NotFoundError') errorMsg += 'No se encontró ninguna cámara.';
    else if (error.name === 'NotReadableError') errorMsg += 'La cámara está siendo usada por otra aplicación.';
    else errorMsg += error.message || 'Error desconocido';
    showError(errorMsg);
  }
};

// Función para detener AR
const stopAR = async () => {
  isRunning = false;
  try {
    if (arToolkitSource) {
      const video = arToolkitSource.domElement;
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
      }
    }
    arToolkitSource = null;
    arToolkitContext = null;
    markerRoot = null;
    console.log('✅ AR.js detenido');
  } catch (error) {
    console.error('Error deteniendo AR.js:', error);
  }
};

// (mantener setupTouchControls, createCaptureButton, captureScreen, etc.)
window.stopAR = stopAR;