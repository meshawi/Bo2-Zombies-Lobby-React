export type Project = {
  id: string
  /** Big title on the lobby screen (the "map" name). */
  title: string
  /** Short category line, shown after the title like "NUKETOWN / SURVIVAL". */
  mode: string
  subtitle: string
  description: string
  /** Where the marker sits. The dummy projects are placed on plate boundaries, where the lava runs. */
  location: { city: string; country: string; lat: number; lon: number }
  /** Screenshot shown in the framed preview. */
  image: string
  accent: string
  type: string
  status: 'Live' | 'In Progress' | 'Archived'
  year: string
  role: string
  platform: string
  license: string
  stack: string[]
  team: { name: string; role: string; emblem: string; score: number }[]
  highlights: string[]
  links: { live?: string; source?: string }
}

export const projects: Project[] = [
  {
    id: 'transit',
    title: 'Transit',
    mode: 'Web App',
    subtitle: 'Realtime fleet dashboard',
    description:
      'Live operations console for a 340-vehicle delivery fleet. Streams GPS, route deviations and driver telemetry over WebSockets, replays any route hour by hour, and pages dispatch when an incident opens.',
    location: { city: 'San Francisco', country: 'U.S.A.', lat: 37.77, lon: -122.42 },
    image: '/projects/transit.svg',
    accent: '#ff7a1a',
    type: 'Web application',
    status: 'Live',
    year: '2025',
    role: 'Lead full-stack engineer',
    platform: 'Browser, PWA',
    license: 'Proprietary',
    stack: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'PostGIS', 'WebSockets', 'Mapbox GL', 'Redis'],
    team: [
      { name: 'You', role: 'Lead engineer', emblem: '#ff7a1a', score: 1240 },
      { name: 'M. Ortega', role: 'Product design', emblem: '#3aa0ff', score: 860 },
      { name: 'K. Adeyemi', role: 'Backend', emblem: '#9cff3a', score: 910 },
    ],
    highlights: [
      'Sub-second position updates for 340 vehicles on one map',
      'Route replay with scrubbing across 30 days of history',
      'Cut average incident response from 14 min to 6 min',
    ],
    links: { live: 'https://transit-demo.example.com', source: 'https://github.com/example/transit' },
  },
  {
    id: 'meridian',
    title: 'Meridian',
    mode: 'IoT Platform',
    subtitle: 'Skyscraper energy monitor',
    description:
      'Ingests readings from 1,200 sensors across a 40-floor tower, aggregates them into per-floor load profiles, flags anomalies and raises predictive maintenance tickets before equipment fails.',
    location: { city: 'Tokyo', country: 'Japan', lat: 35.68, lon: 139.69 },
    image: '/projects/meridian.svg',
    accent: '#ffb02e',
    type: 'IoT platform',
    status: 'In Progress',
    year: '2026',
    role: 'Backend and data engineer',
    platform: 'Kubernetes, edge gateways',
    license: 'Proprietary',
    stack: ['Go', 'Kafka', 'TimescaleDB', 'Grafana', 'Docker', 'MQTT'],
    team: [
      { name: 'You', role: 'Backend engineer', emblem: '#ffb02e', score: 980 },
      { name: 'L. Chen', role: 'Data science', emblem: '#c04dff', score: 1105 },
    ],
    highlights: [
      '48k messages per second sustained on three nodes',
      'Anomaly model catches 92% of HVAC faults a day early',
      'Energy use down 11% in the first quarter',
    ],
    links: { source: 'https://github.com/example/meridian' },
  },
  {
    id: 'archive',
    title: 'Archive',
    mode: 'Search',
    subtitle: 'Historical records search',
    description:
      'Full-text search across two million scanned harbour and customs documents. OCR cleanup pipeline, faceted filters by year, type and language, and a keyboard-first reader for researchers.',
    location: { city: 'Reykjavik', country: 'Iceland', lat: 64.15, lon: -21.94 },
    image: '/projects/archive.svg',
    accent: '#d9a04a',
    type: 'Search engine',
    status: 'Live',
    year: '2024',
    role: 'Solo developer',
    platform: 'Browser',
    license: 'MIT',
    stack: ['Python', 'FastAPI', 'Elasticsearch', 'Tesseract', 'Svelte', 'S3'],
    team: [{ name: 'You', role: 'Everything', emblem: '#d9a04a', score: 2210 }],
    highlights: [
      '2.1M pages indexed, median query 84 ms',
      'OCR post-correction raised accuracy from 88% to 97%',
      'Used by three university archives',
    ],
    links: { live: 'https://archive-demo.example.com', source: 'https://github.com/example/archive' },
  },
  {
    id: 'gatekeeper',
    title: 'Gatekeeper',
    mode: 'Security',
    subtitle: 'Zero-trust access gateway',
    description:
      'Authentication gateway with hardware key support, per-session risk scoring and step-up prompts. Ships with a self-service console for policies, audit trails and key enrolment.',
    location: { city: 'Istanbul', country: 'Turkey', lat: 41.01, lon: 28.98 },
    image: '/projects/gatekeeper.svg',
    accent: '#ff4d2e',
    type: 'Security service',
    status: 'Live',
    year: '2025',
    role: 'Security engineer',
    platform: 'Linux, containers',
    license: 'Apache 2.0',
    stack: ['Rust', 'Axum', 'Redis', 'WebAuthn', 'React', 'OpenTelemetry'],
    team: [
      { name: 'You', role: 'Security engineer', emblem: '#ff4d2e', score: 1330 },
      { name: 'S. Novak', role: 'Frontend', emblem: '#3aa0ff', score: 720 },
      { name: 'D. Weaver', role: 'Operations', emblem: '#9cff3a', score: 640 },
      { name: 'A. Rahimi', role: 'QA', emblem: '#ffe36e', score: 510 },
    ],
    highlights: [
      '14k concurrent sessions at 3 ms median decision time',
      '96% of staff enrolled on passkeys within a month',
      'Passed an external penetration test with no critical findings',
    ],
    links: { source: 'https://github.com/example/gatekeeper' },
  },
  {
    id: 'terraform',
    title: 'Terraform',
    mode: 'Graphics Tool',
    subtitle: 'Procedural terrain toolkit',
    description:
      'GPU-driven terrain generator with hydraulic and thermal erosion, a node graph editor for layering passes, and glTF export straight into game engines.',
    location: { city: 'Santiago', country: 'Chile', lat: -33.45, lon: -70.67 },
    image: '/projects/terraform.svg',
    accent: '#ff8c3a',
    type: 'Desktop tool',
    status: 'Archived',
    year: '2023',
    role: 'Graphics programmer',
    platform: 'Windows, Linux',
    license: 'GPL 3.0',
    stack: ['C++', 'Vulkan', 'GLSL', 'ImGui', 'CMake'],
    team: [
      { name: 'You', role: 'Graphics', emblem: '#ff8c3a', score: 1540 },
      { name: 'T. Ito', role: 'Tools', emblem: '#c04dff', score: 890 },
    ],
    highlights: [
      'Two million cell erosion pass at 60 fps',
      'Node graph with live preview and undo history',
      'Used in two shipped indie titles',
    ],
    links: { source: 'https://github.com/example/terraform' },
  },
  {
    id: 'stress',
    title: 'Stress',
    mode: 'DevTool',
    subtitle: 'Distributed load testing',
    description:
      'Load generator that replays production traffic shapes from dozens of agents and grades each service on a survival scoreboard, round by round, until something breaks.',
    location: { city: 'Wellington', country: 'New Zealand', lat: -41.29, lon: 174.78 },
    image: '/projects/stress.svg',
    accent: '#ffd23a',
    type: 'Developer tool',
    status: 'Live',
    year: '2024',
    role: 'Platform engineer',
    platform: 'Kubernetes',
    license: 'MIT',
    stack: ['Go', 'gRPC', 'Kubernetes', 'Prometheus', 'Next.js'],
    team: [
      { name: 'You', role: 'Platform engineer', emblem: '#ffd23a', score: 1170 },
      { name: 'R. Okafor', role: 'SRE', emblem: '#9cff3a', score: 1020 },
    ],
    highlights: [
      '184k requests per second from 48 agents',
      'Found a connection leak that had hidden for two years',
      'Scoreboard now part of every release gate',
    ],
    links: { live: 'https://stress-demo.example.com', source: 'https://github.com/example/stress' },
  },
]
