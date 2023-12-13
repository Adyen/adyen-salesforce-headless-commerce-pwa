/* eslint-disable no-undef */
import {mswServer} from './msw-server'

beforeAll(() => mswServer.listen())
afterEach(() => mswServer.resetHandlers())
afterAll(() => mswServer.close())
