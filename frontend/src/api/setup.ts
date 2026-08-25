/**
 * Setup API endpoints
 */
import axios from 'axios'
import { buildGatewayUrl } from './url'

const SETUP_TOKEN_STORAGE_KEY = 'sub2api_setup_token'
const SETUP_TOKEN_HEADER = 'X-Setup-Token'

function captureSetupTokenFromURL(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const token = url.searchParams.get('setup_token')?.trim()
  if (!token) return
  sessionStorage.setItem(SETUP_TOKEN_STORAGE_KEY, token)
  url.searchParams.delete('setup_token')
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

captureSetupTokenFromURL()

// Create a separate client for setup endpoints (not under /api/v1)
const setupClient = axios.create({
  baseURL: buildGatewayUrl('/').replace(/\/+$/, ''),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

setupClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(SETUP_TOKEN_STORAGE_KEY)
  if (token && config.headers) {
    config.headers[SETUP_TOKEN_HEADER] = token
  }
  return config
})

export interface SetupStatus {
  needs_setup: boolean
  step: string
  requires_token?: boolean
}

export interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  dbname: string
  sslmode: string
}

export interface RedisConfig {
  host: string
  port: number
  username: string
  password: string
  db: number
  enable_tls: boolean
}

export interface AdminConfig {
  email: string
  password: string
}

export interface ServerConfig {
  host: string
  port: number
  mode: string
}

export interface InstallRequest {
  database: DatabaseConfig
  redis: RedisConfig
  admin: AdminConfig
  server: ServerConfig
}

export interface InstallResponse {
  message: string
  restart: boolean
}

/**
 * Get setup status
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  const response = await setupClient.get('/setup/status')
  return response.data.data
}

/**
 * Test database connection
 */
export async function testDatabase(config: DatabaseConfig): Promise<void> {
  await setupClient.post('/setup/test-db', config)
}

/**
 * Test Redis connection
 */
export async function testRedis(config: RedisConfig): Promise<void> {
  await setupClient.post('/setup/test-redis', config)
}

/**
 * Perform installation
 */
export async function install(config: InstallRequest): Promise<InstallResponse> {
  const response = await setupClient.post('/setup/install', config)
  return response.data.data
}
