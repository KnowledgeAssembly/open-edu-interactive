import { z } from 'zod';
import { EnvelopeSchema } from './envelope.zod.js';

export type EngineSpec = z.infer<typeof EnvelopeSchema>;
