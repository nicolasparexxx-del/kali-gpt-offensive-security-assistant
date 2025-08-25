// BLACKBOX AI - Sistema de Auto-Programación
// Este archivo controla toda la funcionalidad de la IA

class BlackboxAI {
    constructor() {
        this.isActive = false;
        this.currentProject = null;
        this.projects = [];
        this.capabilities = [
            'web-apps', 'mobile-apps', 'ai-models', 'ecommerce', 
            'games', 'blockchain', 'automation', 'security-tools',
            'data-analysis', 'api-services', 'desktop-apps', 'iot'
        ];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadProjects();
        this.updateStatus();
    }

    setupEventListeners() {
        // Botón de activación principal
        document.getElementById('activate-btn').addEventListener('click', () => {
            this.activate();
        });

        // Comandos rápidos
        document.querySelectorAll('.quick-cmd').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.executeQuickCommand(e.target.dataset.command);
            });
        });

        // Input de comando personalizado
        document.getElementById('custom-command').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.executeCommand(e.target.value);
                e.target.value = '';
            }
        });
    }

    activate() {
        this.isActive = true;
        this.updateStatus();
        this.showNotification('🚀 BLACKBOX AI Activado', 'success');
        this.startListening();
    }

    startListening() {
        // Activar reconocimiento de voz si está disponible
        if ('webkitSpeechRecognition' in window) {
            this.setupVoiceRecognition();
        }
    }

    setupVoiceRecognition() {
        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const command = event.results[event.results.length - 1][0].transcript;
            this.executeCommand(command);
        };

        recognition.start();
        this.showNotification('🎤 Escuchando comandos de voz...', 'info');
    }

    async executeCommand(command) {
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command })
            });

            const result = await response.json();
            this.handleCommandResult(result);
        } catch (error) {
            this.handleError(error);
        } finally {
            this.showLoading(false);
        }
    }

    executeQuickCommand(command) {
        const commands = {
            'web-app': 'Crear una aplicación web moderna con React y Node.js',
            'mobile-app': 'Crear una app móvil con React Native',
            'ai-model': 'Crear un modelo de IA con TensorFlow.js',
            'ecommerce': 'Crear tienda online con carrito de compras',
            'game': 'Crear un juego 2D con Canvas y JavaScript',
            'api': 'Crear API REST con Express.js',
            'security': 'Crear herramienta de seguridad con Python',
            'automation': 'Crear script de automatización'
        };

        this.executeCommand(commands[command]);
    }

    handleCommandResult(result) {
        if (result.success) {
            this.showNotification(`✅ ${result.message}`, 'success');
            this.createProject(result.project);
            this.displayProject(result.project);
        } else {
            this.showNotification(`❌ Error: ${result.error}`, 'error');
        }
    }

    createProject(projectData) {
        const project = {
            id: Date.now(),
            name: projectData.name,
            type: projectData.type,
            status: 'creating',
            progress: 0,
            files: [],
            created: new Date().toISOString()
        };

        this.projects.push(project);
        this.currentProject = project;
        this.saveProjects();
        this.updateProjectList();
    }

    displayProject(project) {
        const container = document.getElementById('project-display');
        container.innerHTML = `
            <div class="project-card">
                <h3>${project.name}</h3>
                <div class="project-type">${project.type}</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
                <div class="project-files" id="project-files-${project.id}"></div>
                <button onclick="blackbox.runProject(${project.id})">Ejecutar</button>
                <button onclick="blackbox.downloadProject(${project.id})">Descargar</button>
            </div>
        `;

        this.simulateProgress(project);
    }

    simulateProgress(project) {
        const progressBar = document.querySelector(`#project-display .progress-fill`);
        let progress = 0;
        
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                project.status = 'completed';
                this.saveProjects();
            }
            
            progressBar.style.width = `${progress}%`;
            project.progress = progress;
        }, 500);
    }

    async runProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        this.showNotification(`🚀 Ejecutando ${project.name}...`, 'info');
        
        // Aquí se ejecutaría el proyecto
        // Por ahora, abriremos una nueva ventana con el proyecto
        window.open(`/projects/${projectId}`, '_blank');
    }

    downloadProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        // Crear archivo ZIP con el proyecto
        this.createZip(project);
    }

    createZip(project) {
        // Simulación de creación de ZIP
        const link = document.createElement('a');
        link.href = `/api/download/${project.id}`;
        link.download = `${project.name}.zip`;
        link.click();
    }

    updateProjectList() {
        const container = document.getElementById('project-list');
        container.innerHTML = this.projects.map(project => `
            <div class="project-item">
                <span>${project.name}</span>
                <span class="status ${project.status}">${project.status}</span>
            </div>
        `).join('');
    }

    updateStatus() {
        const statusElement = document.getElementById('status');
        statusElement.textContent = this.isActive ? 'Activo' : 'Inactivo';
        statusElement.className = this.isActive ? 'status-active' : '';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showLoading(show) {
        const loading = document.querySelector('.loading');
        loading.style.display = show ? 'block' : 'none';
    }

    saveProjects() {
        localStorage.setItem('blackbox-projects', JSON.stringify(this.projects));
    }

    loadProjects() {
        const saved = localStorage.getItem('blackbox-projects');
        if (saved) {
            this.projects = JSON.parse(saved);
            this.updateProjectList();
        }
    }

    // Métodos específicos para diferentes tipos de proyectos
    async createWebApp(specs) {
        const project = {
            name: specs.name || 'Web App',
            type: 'web-app',
            structure: {
                frontend: specs.frontend || 'react',
                backend: specs.backend || 'node',
                database: specs.database || 'mongodb'
            }
        };

        return await this.generateWebApp(project);
    }

    async createMobileApp(specs) {
        const project = {
            name: specs.name || 'Mobile App',
            type: 'mobile-app',
            framework: specs.framework || 'react-native'
        };

        return await this.generateMobileApp(project);
    }

    async createAIModel(specs) {
        const project = {
            name: specs.name || 'AI Model',
            type: 'ai-model',
            model: specs.model || 'neural-network',
            framework: specs.framework || 'tensorflow'
        };

        return await this.generateAIModel(project);
    }

    async generateWebApp(project) {
        // Aquí iría la lógica real de generación
        return {
            success: true,
            project: project,
            files: [
                'package.json',
                'src/index.js',
                'src/App.js',
                'public/index.html',
                'README.md'
            ]
        };
    }

    async generateMobileApp(project) {
        return {
            success: true,
            project: project,
            files: [
                'package.json',
                'App.js',
                'src/screens/Home.js',
                'src/components/Header.js'
            ]
        };
    }

    async generateAIModel(project) {
        return {
            success: true,
            project: project,
            files: [
                'model.py',
                'train.py',
                'predict.py',
                'requirements.txt'
            ]
        };
    }
}

// Inicializar BLACKBOX AI
const blackbox = new BlackboxAI();

// API para comunicación con el backend
class BlackboxAPI {
    static async executeCommand(command) {
        // Aquí se conectaría con el backend real
        // Por ahora, simulamos respuestas
        const commands = {
            'web': () => blackbox.createWebApp({ name: 'Mi Web App' }),
            'mobile': () => blackbox.createMobileApp({ name: 'Mi App Móvil' }),
            'ai': () => blackbox.createAIModel({ name: 'Mi Modelo IA' })
        };

        const key = command.toLowerCase().split(' ')[0];
        if (commands[key]) {
            return await commands[key]();
        }

        return {
            success: true,
            project: {
                name: `Proyecto: ${command}`,
                type: 'custom'
            }
        };
    }
}

// Comandos de voz adicionales
const voiceCommands = {
    'crear web': () => blackbox.createWebApp({ name: 'Web App por Voz' }),
    'crear app': () => blackbox.createMobileApp({ name: 'App Móvil por Voz' }),
    'crear ia': () => blackbox.createAIModel({ name: 'Modelo IA por Voz' }),
    'descargar proyecto': () => blackbox.downloadProject(blackbox.currentProject?.id),
    'ejecutar proyecto': () => blackbox.runProject(blackbox.currentProject?.id)
};

// Exportar para uso global
window.blackbox = blackbox;
window.BlackboxAPI = BlackboxAPI;
