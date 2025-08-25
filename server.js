// BLACKBOX AI - Servidor Backend Auto-Programador
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const archiver = require('archiver');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// Base de datos en memoria (en producción usar MongoDB/PostgreSQL)
let projects = [];
let users = [];
let aiModels = [];

// Configuración de IA
const AI_CONFIG = {
    openrouter: {
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'anthropic/claude-sonnet-4',
        apiKey: process.env.OPENROUTER_API_KEY || 'your-api-key-here'
    }
};

// Generadores de código especializados
class CodeGenerator {
    static async generateWebApp(specs) {
        const { name, frontend, backend, database, features } = specs;
        
        const files = {
            'package.json': JSON.stringify({
                name: name.toLowerCase().replace(/\s+/g, '-'),
                version: '1.0.0',
                description: `Aplicación web generada por BLACKBOX AI`,
                main: 'server.js',
                scripts: {
                    start: 'node server.js',
                    dev: 'nodemon server.js',
                    build: frontend === 'react' ? 'npm run build:react' : 'echo "Build complete"',
                    'build:react': 'cd client && npm run build'
                },
                dependencies: {
                    express: '^4.18.2',
                    cors: '^2.8.5',
                    ...(database === 'mongodb' && { mongoose: '^7.0.0' }),
                    ...(database === 'postgresql' && { pg: '^8.8.0' }),
                    ...(features?.includes('auth') && { 
                        jsonwebtoken: '^9.0.0',
                        bcryptjs: '^2.4.3'
                    })
                }
            }, null, 2),

            'server.js': this.generateServerCode(backend, database, features),
            'README.md': this.generateReadme(name, specs),
            '.env.example': this.generateEnvExample(database, features),
            'client/src/App.js': frontend === 'react' ? this.generateReactApp(name, features) : null,
            'client/public/index.html': frontend === 'react' ? this.generateReactHTML(name) : this.generateVanillaHTML(name, features),
            'client/src/index.css': this.generateCSS(features),
            'routes/api.js': this.generateAPIRoutes(features),
            'models/User.js': database === 'mongodb' ? this.generateMongooseModel() : null,
            'middleware/auth.js': features?.includes('auth') ? this.generateAuthMiddleware() : null
        };

        // Filtrar archivos null
        Object.keys(files).forEach(key => {
            if (files[key] === null) delete files[key];
        });

        return files;
    }

    static generateServerCode(backend, database, features) {
        return `
const express = require('express');
const cors = require('cors');
const path = require('path');
${database === 'mongodb' ? "const mongoose = require('mongoose');" : ''}
${features?.includes('auth') ? "const jwt = require('jsonwebtoken');" : ''}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('client/public'));

${database === 'mongodb' ? `
// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blackbox-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
` : ''}

// Rutas
app.use('/api', require('./routes/api'));

// Servir aplicación React
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/public/index.html'));
});

app.listen(PORT, () => {
    console.log(\`🚀 Servidor ejecutándose en puerto \${PORT}\`);
    console.log(\`📱 Aplicación creada por BLACKBOX AI\`);
});
`;
    }

    static generateReactApp(name, features) {
        return `
import React, { useState, useEffect } from 'react';
import './index.css';

function App() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    ${features?.includes('auth') ? 'const [user, setUser] = useState(null);' : ''}

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/data');
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    ${features?.includes('auth') ? `
    const handleLogin = async (credentials) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const result = await response.json();
            if (result.token) {
                localStorage.setItem('token', result.token);
                setUser(result.user);
            }
        } catch (error) {
            console.error('Login error:', error);
        }
    };
    ` : ''}

    return (
        <div className="app">
            <header className="app-header">
                <h1>🚀 ${name}</h1>
                <p>Creado por BLACKBOX AI</p>
            </header>
            
            <main className="app-main">
                ${features?.includes('auth') ? `
                {!user ? (
                    <div className="auth-section">
                        <h2>Iniciar Sesión</h2>
                        {/* Formulario de login aquí */}
                    </div>
                ) : (
                ` : ''}
                    <div className="content-section">
                        {loading ? (
                            <div className="loading">Cargando...</div>
                        ) : (
                            <div className="data-grid">
                                {data.map((item, index) => (
                                    <div key={index} className="data-card">
                                        <h3>{item.title || \`Item \${index + 1}\`}</h3>
                                        <p>{item.description || 'Descripción del elemento'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ${features?.includes('auth') ? ')}' : ''}
            </main>
        </div>
    );
}

export default App;
`;
    }

    static generateMobileApp(specs) {
        const { name, framework, features } = specs;
        
        return {
            'package.json': JSON.stringify({
                name: name.toLowerCase().replace(/\s+/g, '-'),
                version: '1.0.0',
                main: 'App.js',
                scripts: {
                    start: 'expo start',
                    android: 'expo start --android',
                    ios: 'expo start --ios',
                    web: 'expo start --web'
                },
                dependencies: {
                    'expo': '~49.0.0',
                    'react': '18.2.0',
                    'react-native': '0.72.0',
                    '@react-navigation/native': '^6.1.0',
                    ...(features?.includes('auth') && {
                        '@react-native-async-storage/async-storage': '^1.19.0'
                    })
                }
            }, null, 2),

            'App.js': `
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

export default function App() {
    const [data, setData] = useState([]);

    useEffect(() => {
        // Cargar datos iniciales
        setData([
            { id: 1, title: 'Bienvenido', description: 'App creada por BLACKBOX AI' },
            { id: 2, title: 'Funcionalidad', description: 'Lista de características' }
        ]);
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>📱 ${name}</Text>
            <Text style={styles.subtitle}>Creado por BLACKBOX AI</Text>
            
            <ScrollView style={styles.content}>
                {data.map(item => (
                    <TouchableOpacity key={item.id} style={styles.card}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardDescription}>{item.description}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        paddingTop: 50,
        paddingHorizontal: 20
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#667eea',
        textAlign: 'center',
        marginBottom: 10
    },
    subtitle: {
        fontSize: 16,
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 30
    },
    content: {
        flex: 1
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 20,
        borderRadius: 15,
        marginBottom: 15
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 5
    },
    cardDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)'
    }
});
`
        };
    }

    static generateReadme(name, specs) {
        return `# ${name}

## 📋 Descripción
${name} - Aplicación generada automáticamente por BLACKBOX AI

## 🚀 Características
- Frontend: ${specs.frontend || 'React'}
- Backend: ${specs.backend || 'Node.js'}
- Base de datos: ${specs.database || 'MongoDB'}
- Funcionalidades: ${specs.features?.join(', ') || 'Básicas'}

## 🛠️ Instalación

1. Instalar dependencias:
\`\`\`bash
npm install
\`\`\`

2. Configurar variables de entorno:
\`\`\`bash
cp .env.example .env
# Editar .env con tus configuraciones
\`\`\`

3. Iniciar la aplicación:
\`\`\`bash
npm start
\`\`\`

## 📱 Uso
La aplicación estará disponible en: http://localhost:3000

## 🤖 Generado por BLACKBOX AI
Esta aplicación fue creada automáticamente por BLACKBOX AI - Auto Programador Universal.

## 📄 Licencia
MIT License
`;
    }

    static generateEnvExample(database, features) {
        let envContent = `# Variables de entorno
PORT=3000
NODE_ENV=development

`;
        
        if (database === 'mongodb') {
            envContent += `# MongoDB
MONGODB_URI=mongodb://localhost:27017/${database}

`;
        } else if (database === 'postgresql') {
            envContent += `# PostgreSQL
DATABASE_URL=postgresql://localhost:5432/${database}

`;
        }
        
        if (features?.includes('auth')) {
            envContent += `# Autenticación
JWT_SECRET=your_jwt_secret_here
BCRYPT_ROUNDS=12

`;
        }
        
        return envContent;
    }

    static generateAPIRoutes(features) {
        return `const express = require('express');
const router = express.Router();

// Ruta básica
router.get('/', (req, res) => {
    res.json({ 
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString(),
        generatedBy: 'BLACKBOX AI'
    });
});

// Ruta de datos
router.get('/data', (req, res) => {
    const sampleData = [
        { id: 1, title: 'Elemento 1', description: 'Descripción del elemento 1' },
        { id: 2, title: 'Elemento 2', description: 'Descripción del elemento 2' },
        { id: 3, title: 'Elemento 3', description: 'Descripción del elemento 3' }
    ];
    
    res.json(sampleData);
});

${features?.includes('auth') ? `
// Rutas de autenticación
router.post('/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Aquí iría la lógica de autenticación real
    if (email && password) {
        const token = 'sample_jwt_token';
        res.json({ 
            success: true, 
            token,
            user: { id: 1, email, name: 'Usuario Demo' }
        });
    } else {
        res.status(400).json({ success: false, message: 'Credenciales requeridas' });
    }
});

router.post('/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    
    // Aquí iría la lógica de registro real
    if (name && email && password) {
        res.json({ 
            success: true, 
            message: 'Usuario registrado exitosamente',
            user: { id: Date.now(), name, email }
        });
    } else {
        res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
    }
});
` : ''}

module.exports = router;
`;
    }

    static generateMongooseModel() {
        return `const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Método para ocultar password en JSON
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

module.exports = mongoose.model('User', userSchema);
`;
    }

    static generateAuthMiddleware() {
        return `const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token de acceso requerido' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

module.exports = auth;
`;
    }

    static generateCSS(features) {
        return `/* Estilos generados por BLACKBOX AI */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    color: #333;
}

.app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.app-header {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 2rem;
    text-align: center;
    color: white;
}

.app-header h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    background: linear-gradient(45deg, #fff, #f0f0f0);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.app-main {
    flex: 1;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
}

.content-section {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 20px;
    padding: 2rem;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.data-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-top: 2rem;
}

.data-card {
    background: white;
    border-radius: 15px;
    padding: 1.5rem;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.data-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.data-card h3 {
    color: #667eea;
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
}

.data-card p {
    color: #666;
    line-height: 1.6;
}

.loading {
    text-align: center;
    padding: 3rem;
    color: #667eea;
    font-size: 1.2rem;
}

${features?.includes('auth') ? `
.auth-section {
    background: rgba(255, 255, 255, 0.9);
    border-radius: 20px;
    padding: 2rem;
    max-width: 400px;
    margin: 2rem auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.auth-section h2 {
    text-align: center;
    color: #667eea;
    margin-bottom: 1.5rem;
}

.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: #333;
    font-weight: 500;
}

.form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
}

.form-group input:focus {
    outline: none;
    border-color: #667eea;
}

.btn-primary {
    width: 100%;
    padding: 0.75rem;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.btn-primary:hover {
    transform: translateY(-2px);
}
` : ''}

/* Responsive */
@media (max-width: 768px) {
    .app-header {
        padding: 1rem;
    }
    
    .app-header h1 {
        font-size: 2rem;
    }
    
    .app-main {
        padding: 1rem;
    }
    
    .data-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
}

/* Animaciones */
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.data-card {
    animation: fadeIn 0.5s ease-out;
}
`;
    }

    static generateVanillaHTML(name, features) {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
    <link rel="stylesheet" href="src/index.css">
</head>
<body>
    <div class="app">
        <header class="app-header">
            <h1>🚀 ${name}</h1>
            <p>Creado por BLACKBOX AI</p>
        </header>
        
        <main class="app-main">
            <div class="content-section">
                <h2>Bienvenido a ${name}</h2>
                <div id="loading" class="loading">Cargando datos...</div>
                <div id="data-container" class="data-grid" style="display: none;"></div>
            </div>
        </main>
    </div>
    
    <script>
        // Cargar datos desde la API
        async function loadData() {
            try {
                const response = await fetch('/api/data');
                const data = await response.json();
                
                const container = document.getElementById('data-container');
                const loading = document.getElementById('loading');
                
                container.innerHTML = data.map(item => \`
                    <div class="data-card">
                        <h3>\${item.title}</h3>
                        <p>\${item.description}</p>
                    </div>
                \`).join('');
                
                loading.style.display = 'none';
                container.style.display = 'grid';
            } catch (error) {
                console.error('Error cargando datos:', error);
                document.getElementById('loading').textContent = 'Error cargando datos';
            }
        }
        
        // Cargar datos al iniciar
        document.addEventListener('DOMContentLoaded', loadData);
    </script>
</body>
</html>`;
    }

    static generateReactHTML(name) {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name}</title>
</head>
<body>
    <div id="root"></div>
    <script src="/static/js/bundle.js"></script>
</body>
</html>`;
    }

    static generateAIModel(specs) {
        const { name, modelType, framework } = specs;
        
        return {
            'requirements.txt': `
tensorflow==2.13.0
numpy==1.24.0
pandas==2.0.0
scikit-learn==1.3.0
matplotlib==3.7.0
jupyter==1.0.0
`,
            'model.py': `
import tensorflow as tf
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

class ${name.replace(/\s+/g, '')}Model:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        
    def create_model(self, input_shape):
        """Crear modelo de IA - Generado por BLACKBOX AI"""
        self.model = tf.keras.Sequential([
            tf.keras.layers.Dense(128, activation='relu', input_shape=input_shape),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dense(1, activation='sigmoid')
        ])
        
        self.model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        return self.model
    
    def train(self, X, y, epochs=100, batch_size=32):
        """Entrenar el modelo"""
        X_scaled = self.scaler.fit_transform(X)
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        history = self.model.fit(
            X_train, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_data=(X_test, y_test),
            verbose=1
        )
        
        return history
    
    def predict(self, X):
        """Hacer predicciones"""
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)
    
    def save_model(self, filepath):
        """Guardar modelo"""
        self.model.save(filepath)
        
    def load_model(self, filepath):
        """Cargar modelo"""
        self.model = tf.keras.models.load_model(filepath)

# Ejemplo de uso
if __name__ == "__main__":
    # Crear instancia del modelo
    ai_model = ${name.replace(/\s+/g, '')}Model()
    
    # Datos de ejemplo (reemplazar con datos reales)
    X_example = np.random.random((1000, 10))
    y_example = np.random.randint(0, 2, 1000)
    
    # Crear y entrenar modelo
    model = ai_model.create_model((10,))
    history = ai_model.train(X_example, y_example)
    
    print("🤖 Modelo de IA creado por BLACKBOX AI")
    print(f"📊 Precisión final: {max(history.history['accuracy']):.4f}")
`,

            'train.py': `
#!/usr/bin/env python3
"""
Script de entrenamiento - Generado por BLACKBOX AI
"""

import pandas as pd
import numpy as np
from model import ${name.replace(/\s+/g, '')}Model
import matplotlib.pyplot as plt

def load_data():
    """Cargar datos de entrenamiento"""
    # Aquí cargarías tus datos reales
    # Por ahora usamos datos sintéticos
    np.random.seed(42)
    X = np.random.random((5000, 10))
    y = (X.sum(axis=1) > 5).astype(int)
    return X, y

def plot_training_history(history):
    """Visualizar el entrenamiento"""
    plt.figure(figsize=(12, 4))
    
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'], label='Precisión Entrenamiento')
    plt.plot(history.history['val_accuracy'], label='Precisión Validación')
    plt.title('Precisión del Modelo')
    plt.xlabel('Época')
    plt.ylabel('Precisión')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'], label='Pérdida Entrenamiento')
    plt.plot(history.history['val_loss'], label='Pérdida Validación')
    plt.title('Pérdida del Modelo')
    plt.xlabel('Época')
    plt.ylabel('Pérdida')
    plt.legend()
    
    plt.tight_layout()
    plt.savefig('training_history.png')
    plt.show()

def main():
    print("🚀 Iniciando entrenamiento del modelo IA...")
    print("📊 Creado por BLACKBOX AI")
    
    # Cargar datos
    X, y = load_data()
    print(f"📈 Datos cargados: {X.shape[0]} muestras, {X.shape[1]} características")
    
    # Crear y entrenar modelo
    ai_model = ${name.replace(/\s+/g, '')}Model()
    model = ai_model.create_model((X.shape[1],))
    
    print("🔄 Entrenando modelo...")
    history = ai_model.train(X, y, epochs=50)
    
    # Guardar modelo
    ai_model.save_model('${name.lower().replace(" ", "_")}_model.h5')
    print("💾 Modelo guardado exitosamente")
    
    # Visualizar resultados
    plot_training_history(history)
    
    # Evaluación final
    final_accuracy = max(history.history['val_accuracy'])
    print(f"🎯 Precisión final: {final_accuracy:.4f}")
    
    if final_accuracy > 0.8:
        print("✅ ¡Modelo entrenado exitosamente!")
    else:
        print("⚠️ El modelo necesita más entrenamiento")

if __name__ == "__main__":
    main()
`
        };
    }
}

// Rutas API
app.post('/api/execute', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`🤖 Ejecutando comando: ${command}`);
        
        const result = await processCommand(command);
        res.json(result);
    } catch (error) {
        console.error('Error ejecutando comando:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

async function processCommand(command) {
    const cmd = command.toLowerCase();
    
    // Detectar tipo de proyecto
    if (cmd.includes('web') || cmd.includes('sitio') || cmd.includes('página')) {
        return await createWebProject(command);
    } else if (cmd.includes('app') || cmd.includes('móvil') || cmd.includes('mobile')) {
        return await createMobileProject(command);
    } else if (cmd.includes('ia') || cmd.includes('ai') || cmd.includes('inteligencia')) {
        return await createAIProject(command);
    } else if (cmd.includes('ecommerce') || cmd.includes('tienda') || cmd.includes('shop')) {
        return await createEcommerceProject(command);
    } else if (cmd.includes('game') || cmd.includes('juego')) {
        return await createGameProject(command);
    } else if (cmd.includes('api') || cmd.includes('servidor')) {
        return await createAPIProject(command);
    } else {
        return await createCustomProject(command);
    }
}

async function createWebProject(command) {
    const projectName = extractProjectName(command) || 'Mi Web App';
    const specs = {
        name: projectName,
        frontend: detectTechnology(command, ['react', 'vue', 'angular']) || 'react',
        backend: detectTechnology(command, ['node', 'express', 'fastapi']) || 'express',
        database: detectTechnology(command, ['mongodb', 'postgresql', 'mysql']) || 'mongodb',
        features: detectFeatures(command)
    };
    
    const files = await CodeGenerator.generateWebApp(specs);
    const project = await saveProject(projectName, 'web-app', files);
    
    return {
        success: true,
        message: `Aplicación web "${projectName}" creada exitosamente`,
        project: project
    };
}

async function createMobileProject(command) {
    const projectName = extractProjectName(command) || 'Mi App Móvil';
    const specs = {
        name: projectName,
        framework: detectTechnology(command, ['react-native', 'flutter', 'ionic']) || 'react-native',
        features: detectFeatures(command)
    };
    
    const files = CodeGenerator.generateMobileApp(specs);
    const project = await saveProject(projectName, 'mobile-app', files);
    
    return {
        success: true,
        message: `App móvil "${projectName}" creada exitosamente`,
        project: project
    };
}

async function createAIProject(command) {
    const projectName = extractProjectName(command) || 'Mi Modelo IA';
    const specs = {
        name: projectName,
        modelType: detectTechnology(command, ['neural-network', 'cnn', 'rnn', 'transformer']) || 'neural-network',
        framework: detectTechnology(command, ['tensorflow', 'pytorch', 'scikit-learn']) || 'tensorflow'
    };
    
    const files = CodeGenerator.generateAIModel(specs);
    const project = await saveProject(projectName, 'ai-model', files);
    
    return {
        success: true,
        message: `Modelo de IA "${projectName}" creado exitosamente`,
        project: project
    };
}

// Funciones auxiliares
function extractProjectName(command) {
    const matches = command.match(/(?:crear|create|hacer|build)\s+(?:una?|an?)\s+(.+?)(?:\s+(?:con|with|usando|using)|\s*$)/i);
    return matches ? matches[1].trim() : null;
}

function detectTechnology(command, technologies) {
    return technologies.find(tech => command.toLowerCase().includes(tech));
}

function detectFeatures(command) {
    const features = [];
    if (command.includes('auth') || command.includes('login') || command.includes('usuario')) {
        features.push('auth');
    }
    if (command.includes('chat') || command.includes('mensaje')) {
        features.push('chat');
    }
    if (command.includes('pago') || command.includes('payment')) {
        features.push('payment');
    }
    return features;
}

async function saveProject(name, type, files) {
    const project = {
        id: Date.now(),
        name,
        type,
        files,
        created: new Date().toISOString(),
        status: 'completed'
    };
    
    projects.push(project);
    
    // Crear directorio del proyecto
    const projectDir = path.join(__dirname, 'projects', project.id.toString());
    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
    }
    
    // Escribir archivos
    for (const [filename, content] of Object.entries(files)) {
        const filepath = path.join(projectDir, filename);
        const dir = path.dirname(filepath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, content);
    }
    
    return project;
}

// Rutas adicionales
app.get('/api/projects', (req, res) => {
    res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
    const project = projects.find(p => p.id == req.params.id);
    if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json(project);
});

app.get('/api/download/:id', (req, res) => {
    const project = projects.find(p => p.id == req.params.id);
    if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    
    const projectDir = path.join(__dirname, 'projects', project.id.toString());
    const zipPath = path.join(__dirname, 'temp', `${project.name}.zip`);
    
    // Crear ZIP
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip');
    
    archive.pipe(output);
    archive.directory(projectDir, false);
    archive.finalize();
    
    output.on('close', () => {
        res.download(zipPath, `${project.name}.zip`, (err) => {
            if (!err) {
                fs.unlinkSync(zipPath); // Limpiar archivo temporal
            }
        });
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🤖 BLACKBOX AI Auto-Programador ejecutándose en puerto ${PORT}`);
    console.log(`🚀 Listo para crear cualquier software que necesites`);
    console.log(`📱 Accede a: http://localhost:${PORT}/activator.html`);
});

module.exports = app;
