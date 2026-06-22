#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** At least 11 days ahead — API requires 10+ days notice for new auctions. */
function defaultAuctionDate() {
  const d = new Date();
  d.setDate(d.getDate() + 11);
  return d.toISOString().slice(0, 10);
}

const COMMON_JSON_TEST = [
  'pm.test("Response is JSON when body present", function () {',
  '  if (pm.response.text() && pm.response.text().length > 0) {',
  '    pm.response.to.be.json;',
  '  }',
  '});',
];

function tests(statusCodes, extra = []) {
  const codes = Array.isArray(statusCodes) ? statusCodes : [statusCodes];
  return [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          `pm.test("Status code is one of [${codes.join(', ')}]", function () {`,
          `  pm.expect([${codes.join(', ')}]).to.include(pm.response.code);`,
          '});',
          ...COMMON_JSON_TEST,
          ...extra,
        ],
      },
    },
  ];
}

function bearerHeader() {
  return [{ key: 'Authorization', value: 'Bearer {{access_token}}' }];
}

function jsonHeader() {
  return [{ key: 'Content-Type', value: 'application/json' }, ...bearerHeader()];
}

function url(pathSegments, query = []) {
  const path = pathSegments.filter(Boolean);
  const rawQuery = query.length
    ? `?${query.map((q) => `${q.key}=${q.value}`).join('&')}`
    : '';
  return {
    raw: `{{base_url}}/${path.join('/')}${rawQuery}`,
    host: ['{{base_url}}'],
    path,
    ...(query.length
      ? {
          query: query.map((q) => ({
            key: q.key,
            value: q.value,
            ...(q.description ? { description: q.description } : {}),
          })),
        }
      : {}),
  };
}

function req(name, method, pathSegments, opts = {}) {
  const {
    description = '',
    body = null,
    query = [],
    auth = true,
    headers = [],
    events = [],
    status = 200,
    extraTests = [],
  } = opts;

  const request = {
    method,
    header: auth
      ? body
        ? jsonHeader()
        : bearerHeader()
      : body
        ? [{ key: 'Content-Type', value: 'application/json' }]
        : [],
    url: url(pathSegments, query),
    description,
  };

  if (body) {
    request.body = { mode: 'raw', raw: body };
  }

  if (headers.length) {
    request.header = [...request.header, ...headers];
  }

  const item = {
    name,
    request,
    response: [],
    event: [...tests(status, extraTests), ...events],
  };

  if (!auth) {
    item.request.auth = { type: 'noauth' };
  }

  return item;
}

function folder(name, description, items) {
  return { name, description, item: items };
}

const loginTests = [
  'if (pm.response.code === 200) {',
  '  const body = pm.response.json();',
  '  pm.test("accessToken present", function () {',
  '    pm.expect(body.accessToken).to.be.a("string").and.not.empty;',
  '  });',
  '  pm.environment.set("access_token", body.accessToken);',
  '  if (body.employeeId) {',
  '    pm.environment.set("employee_id", String(body.employeeId));',
  '  }',
  '}',
];

const collection = {
  info: {
    _postman_id: 'crownbid-employee-api-2026',
    name: 'CrownBid Employee API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'Complete Postman collection for CrownBid endpoints accessible to the **empleado** (employee/operator) role.\n\n' +
      'There is no separate admin JWT role: all `/api/admin/*` routes use `requireEmployeeAuth`.\n\n' +
      'Import `employee-api.postman_environment.json` and run **Auth → Employee Login** first.',
  },
  auth: {
    type: 'bearer',
    bearer: [{ key: 'token', value: '{{access_token}}', type: 'string' }],
  },
  variable: [
    { key: 'base_url', value: 'http://localhost:3000/api' },
    { key: 'access_token', value: '' },
    { key: 'employee_email', value: 'admin@crownbid.local' },
    { key: 'employee_password', value: 'EmpleadoAdmin2026!' },
  ],
  item: [
    folder(
      '1. Auth',
      'Employee authentication. Client login endpoints are public but not employee workflows.',
      [
        req('Employee Login', 'POST', ['auth', 'employee', 'login'], {
          auth: false,
          status: 200,
          description:
            'Authenticates an employee using `EMPLOYEE_ADMIN_EMAIL` / `EMPLOYEE_ADMIN_PASSWORD` from API `.env` and a row in `dbo.empleados`.\n\n' +
            '**Response 200:** `{ accessToken, employeeId, email, role: "empleado" }`\n\n' +
            '**Errors:** 401 invalid credentials, 422 validation',
          body: JSON.stringify(
            { email: '{{employee_email}}', password: '{{employee_password}}' },
            null,
            2,
          ),
          events: [{ listen: 'test', script: { type: 'text/javascript', exec: loginTests } }],
        }),
        req('Logout', 'POST', ['auth', 'logout'], {
          status: 200,
          description: 'Stateless logout. Requires valid Bearer access token.\n\n**Response:** `{ ok: true, message }`',
          body: '{}',
        }),
        req('Logout — Unauthorized (no token)', 'POST', ['auth', 'logout'], {
          auth: false,
          status: 401,
          description: 'Verifies missing token returns 401.',
          body: '{}',
        }),
      ],
    ),
    folder(
      '2. Employee / Profile',
      'Employee directory and session validation via GET /empleados/me.',
      [
        req('Get Current Employee (me)', 'GET', ['empleados', 'me'], {
          description:
            'Returns the logged-in employee profile from JWT + dbo.empleados.\n\n**Response:** `{ employeeId, email, role, cargo, sector }`',
        }),
        req('List Employees', 'GET', ['empleados'], {
          description: 'Lists employees from `dbo.empleados`.\n\n**Response:** `{ items: [{ identificador, cargo, sector }] }`',
          extraTests: [
            'if (pm.response.code === 200) {',
            '  const body = pm.response.json();',
            '  if (body.items && body.items[0]) {',
            '    pm.environment.set("employee_id", String(body.items[0].identificador));',
            '  }',
            '}',
          ],
        }),
        req('Get Employee by ID', 'GET', ['empleados', '{{employee_id}}'], {
          description: 'Get single employee record.\n\n**Path:** `employee_id` (empleados.identificador)',
        }),
      ],
    ),
    folder(
      '3. Auctions',
      'Create/update via admin routes. Public reads via optional auth. Close item is employee-only.',
      [
        req('Create Auction (Admin)', 'POST', ['admin', 'subastas'], {
          status: 201,
          description:
            'Creates a new auction. Employee-only (`requireEmployeeAuth`).\n\n' +
            '**Schedule rules:** start must be in the future and at least 10 calendar days ahead; `horaFin` after `hora`; duration 15–240 min.\n\n' +
            '**Response 201:** auction summary with `id`. Invalid schedule returns **400** (does not crash the server).',
          body: JSON.stringify(
            {
              fecha: defaultAuctionDate(),
              hora: '18:00',
              horaFin: '22:00',
              ubicacion: 'Salón Principal CrownBid',
              capacidadAsistentes: 120,
              tieneDeposito: 'si',
              seguridadPropia: 'si',
              categoria: 'platino',
              moneda: 'ARS',
            },
            null,
            2,
          ),
          extraTests: [
            'if (pm.response.code === 201) {',
            '  const body = pm.response.json();',
            '  if (body.id) pm.environment.set("auction_id", String(body.id));',
            '}',
          ],
        }),
        req('Update Auction (Admin)', 'PATCH', ['admin', 'subastas', '{{auction_id}}'], {
          description: 'Partial update of auction fields.',
          body: JSON.stringify({ estado: 'abierta', ubicacion: 'Salón Principal — actualizado' }, null, 2),
        }),
        req('Change Auction Status', 'PATCH', ['admin', 'subastas', '{{auction_id}}', 'estado'], {
          description: 'Dedicated status endpoint. DB values: `abierta` | `carrada`.',
          body: JSON.stringify({ estado: 'carrada' }, null, 2),
        }),
        req('List Auctions', 'GET', ['subastas'], {
          auth: false,
          description:
            'Public/optional-auth list. Employee token is accepted but `canAccess`/`canBid` remain false for employees.',
          query: [
            { key: 'status', value: 'scheduled', description: 'scheduled | live | closed' },
            { key: 'category', value: 'platino', description: 'comun | especial | plata | oro | platino' },
          ],
          extraTests: [
            'if (pm.response.code === 200) {',
            '  const body = pm.response.json();',
            '  if (body.items && body.items[0] && body.items[0].id) {',
            '    pm.environment.set("auction_id", String(body.items[0].id));',
            '  }',
            '}',
          ],
        }),
        req('Get Auction by ID', 'GET', ['subastas', '{{auction_id}}'], {
          auth: false,
          description: 'Auction detail. Optional auth.',
        }),
        req('List Auction Catalog Items', 'GET', ['subastas', '{{auction_id}}', 'items'], {
          auth: false,
          description: 'Items assigned to an auction catalog.',
          extraTests: [
            'if (pm.response.code === 200) {',
            '  const body = pm.response.json();',
            '  const items = body.items || body;',
            '  if (Array.isArray(items) && items[0]) {',
            '    const first = items[0];',
            '    if (first.id) pm.environment.set("item_id", String(first.id));',
            '    if (first.productId) pm.environment.set("article_id", String(first.productId));',
            '  }',
            '}',
          ],
        }),
        req('Close Auction Item (Employee)', 'POST', ['subastas', '{{auction_id}}', 'items', '{{item_id}}', 'cerrar'], {
          description:
            'Finalize/close an auction catalog item. Employee-only.\n\n**Body:** optional `{ paymentMethodId }` for winner payment method.\n\n**Response:** finalization result with winner and amounts.',
          body: JSON.stringify({}, null, 2),
        }),
        req('Get Auction Item Result', 'GET', ['subastas', '{{auction_id}}', 'items', '{{item_id}}', 'resultado'], {
          description: 'Post-auction finalization result. Any authenticated user (employee or client).',
        }),
      ],
    ),
    folder(
      '4. Bids (Employee read-only)',
      'Employees can read bid history and live state but cannot place bids.',
      [
        req('Bid History', 'GET', ['subastas', '{{auction_id}}', 'pujos', 'history'], {
          description: 'Operational bid history for employees (read-only).',
          query: [{ key: 'itemId', value: '{{item_id}}' }],
        }),
        req('Live Auction State', 'GET', ['subastas', '{{auction_id}}', 'live'], {
          description: 'Operational live auction data for employees. `canBid` is always false.',
          query: [{ key: 'watchedItemId', value: '{{item_id}}' }],
        }),
      ],
    ),
    folder(
      '5. Submitted Articles / Item Review',
      'Admin submission review workflow (Spanish paths). English aliases exist under `/api/admin/items/submissions`.',
      [
        req('List Submissions', 'GET', ['admin', 'productos', 'solicitudes'], {
          description: 'List item submissions for employee review.',
          query: [
            { key: 'status', value: 'pending', description: 'pending | accepted | assigned | all' },
            { key: 'limit', value: '50' },
            { key: 'offset', value: '0' },
            { key: 'search', value: '', description: 'optional text search' },
          ],
          extraTests: [
            'if (pm.response.code === 200) {',
            '  const body = pm.response.json();',
            '  const items = Array.isArray(body) ? body : body.items;',
            '  if (Array.isArray(items) && items[0]) {',
            '    const row = items[0];',
            '    const id = row.submissionId || row.productId || row.id;',
            '    if (id) pm.environment.set("article_id", String(id));',
            '  }',
            '}',
          ],
        }),
        req('Get Submission Detail', 'GET', ['admin', 'productos', 'solicitudes', '{{article_id}}'], {
          description: 'Full submission detail including photos and metadata.',
          extraTests: [
            'if (pm.response.code === 200) {',
            '  const body = pm.response.json();',
            '  if (body.photos && body.photos[0] && body.photos[0].id) {',
            '    pm.environment.set("image_id", String(body.photos[0].id));',
            '  }',
            '  if (body.productId) pm.environment.set("article_id", String(body.productId));',
            '}',
          ],
        }),
        req('Accept Submission', 'POST', ['admin', 'productos', 'solicitudes', '{{article_id}}', 'aceptar'], {
          description: 'Accept a pending submission and set base price / commission.',
          body: JSON.stringify(
            { basePrice: 15000, commissionPercent: 10, notes: 'Aprobado por operador' },
            null,
            2,
          ),
          extraTests: [
            'if (pm.response.code === 200) {',
            '  const body = pm.response.json();',
            '  if (body.productId) pm.environment.set("article_id", String(body.productId));',
            '}',
          ],
        }),
        req('Reject Submission', 'POST', ['admin', 'productos', 'solicitudes', '{{article_id}}', 'rechazar'], {
          description: 'Reject a pending submission. Persists `motivoRechazo` + `notasRevision` (migration 006).',
          body: JSON.stringify(
            {
              reason: 'El artículo no cumple con los criterios de aceptación.',
              notes: 'Fotos insuficientes / documentación incompleta.',
            },
            null,
            2,
          ),
        }),
        req('Assign Submission to Auction', 'POST', ['admin', 'productos', 'solicitudes', '{{article_id}}', 'asignar-subasta'], {
          description: 'Assign accepted product to auction or existing catalog.',
          body: '{\n  "auctionId": {{auction_id}},\n  "basePrice": 15000,\n  "commissionPercent": 10\n}',
        }),
        req('Legacy — List Pending Review', 'GET', ['admin', 'productos', 'revision'], {
          description: 'Legacy pending-only review list.',
        }),
        req('Legacy — Approve/Reject Decision', 'POST', ['admin', 'productos', '{{article_id}}', 'decision'], {
          description: 'Legacy decision endpoint. Body: `{ decision: "approve" | "reject" }`.',
          body: JSON.stringify({ decision: 'approve' }, null, 2),
        }),
        req('Legacy — Auction Assignment', 'PATCH', ['admin', 'productos', '{{article_id}}', 'auction-assignment'], {
          description:
            'Legacy assignment. Requires `catalogId` OR `subastaId`, plus `precioBase` and `comision`. `catalogDescription` required when creating new catalog.',
          body: '{\n  "subastaId": {{auction_id}},\n  "catalogDescription": "Reloj de bolsillo — catálogo demo",\n  "precioBase": 15000,\n  "comision": 1500\n}',
        }),
      ],
    ),
    folder(
      '6. Catalog / Items',
      'Read-only catalog access for employees.',
      [
        req('List Products', 'GET', ['productos'], {
          description: 'List products in catalog.',
        }),
        req('Get Product by ID', 'GET', ['productos', '{{article_id}}'], {
          description: 'Product detail from `dbo.productos`.',
        }),
        req('Get Product Photo', 'GET', ['productos', '{{article_id}}', 'photos', '{{image_id}}'], {
          description: 'Binary JPEG photo stream.',
          status: [200, 404],
        }),
        req('Get Catalog Item (public)', 'GET', ['items', '{{item_id}}'], {
          auth: false,
          description: 'Catalog item detail via `/api/items/:id` (optional auth).',
        }),
      ],
    ),
    folder(
      '7. Clients / Users',
      'Client admission workflow for employees.',
      [
        req('List Clients', 'GET', ['admin', 'clientes'], {
          description: 'List registered clients for admission review.',
          query: [
            { key: 'admitido', value: 'all', description: 'si | no | all' },
            { key: 'search', value: '' },
            { key: 'limit', value: '50' },
            { key: 'offset', value: '0' },
          ],
          extraTests: [
            'if (pm.response.code === 200) {',
            '  const body = pm.response.json();',
            '  if (body.items && body.items[0] && body.items[0].clienteId) {',
            '    pm.environment.set("client_id", String(body.items[0].clienteId));',
            '    pm.environment.set("user_id", String(body.items[0].clienteId));',
            '  }',
            '}',
          ],
        }),
        req('Get Client Detail', 'GET', ['admin', 'clientes', '{{client_id}}'], {
          description: 'Client detail for admission decisions.',
        }),
        req('Admit Client', 'PATCH', ['admin', 'clientes', '{{client_id}}', 'admitir'], {
          description: 'Approve or reject client admission. Set `categoria` when admitting.',
          body: JSON.stringify({ admitido: 'si', categoria: 'comun' }, null, 2),
        }),
        req('[401 expected] Users Me (not for employees)', 'GET', ['users', 'me'], {
          status: 401,
          description:
            'Passes auth middleware but fails at service layer for employee JWT (persona lookup). Do not use as employee profile.',
        }),
      ],
    ),
    folder(
      '8. Warehouse / Insurance',
      'Assign deposit location and insurance policy to consigned products.',
      [
        req('Assign Deposit Location', 'PATCH', ['admin', 'productos', '{{article_id}}', 'deposito'], {
          description: 'Updates `dbo.productos.depositoUbicacion`.',
          body: JSON.stringify(
            { depositoUbicacion: 'Depósito Central - Sector A - Estante 4' },
            null,
            2,
          ),
        }),
        req('Assign Insurance Policy', 'PATCH', ['admin', 'productos', '{{article_id}}', 'seguro'], {
          description:
            'Upserts `dbo.seguros` and links `dbo.productos.seguro`. Optional `descripcion` / vigencia fields are accepted but not persisted.',
          body: JSON.stringify(
            {
              seguro: 'POL-123456',
              compania: 'Sancor Seguros',
              descripcion: 'Cobertura contra daño, robo o extravío durante custodia',
              importe: 1000,
              polizaCombinada: 'no',
            },
            null,
            2,
          ),
        }),
      ],
    ),
    folder(
      '9. Payment Methods (Admin)',
      'Verify or reject client payment methods.',
      [
        req('List Payment Methods for Review', 'GET', ['admin', 'payment-methods'], {
          description: 'List payment methods pending employee verification.',
          query: [{ key: 'status', value: 'pendiente', description: 'pendiente | verificado | rechazado | deshabilitado | all' }],
          extraTests: [
            'if (pm.response.code === 200) {',
            '  const body = pm.response.json();',
            '  if (body.items && body.items[0] && body.items[0].id) {',
            '    pm.environment.set("payment_method_id", String(body.items[0].id));',
            '  }',
            '}',
          ],
        }),
        req('Verify Payment Method', 'PATCH', ['admin', 'payment-methods', '{{payment_method_id}}', 'verify'], {
          description: 'Mark payment method as verified.',
          body: '{}',
        }),
        req('Reject Payment Method', 'PATCH', ['admin', 'payment-methods', '{{payment_method_id}}', 'reject'], {
          description: 'Reject with reason (1–500 chars).',
          body: JSON.stringify({ reason: 'Documentación del titular no coincide' }, null, 2),
        }),
      ],
    ),
    folder(
      '10. Post-auction / Winners',
      'Employee can close items and read finalization results.',
      [
        req('Get Item Finalization Result', 'GET', ['subastas', '{{auction_id}}', 'items', '{{item_id}}', 'resultado'], {
          description: 'Winner, amounts, and payment summary after close.',
        }),
      ],
    ),
    folder(
      '11. Reference Data',
      'Países and sectores CRUD — any authenticated token (including employee).',
      [
        req('List Countries', 'GET', ['paises'], { description: 'List countries.' }),
        req('Get Country', 'GET', ['paises', '{{category_id}}'], {
          description: 'Uses `category_id` env var as country PK (`paises.numero`) for demo.',
        }),
        req('Create Country', 'POST', ['paises'], {
          status: [201, 409],
          body: JSON.stringify(
            {
              numero: 99001,
              nombre: 'País Demo Postman',
              nombreCorto: 'PD',
              capital: 'Capital Demo',
              nacionalidad: 'Demense',
              idiomas: 'Español',
            },
            null,
            2,
          ),
        }),
        req('Update Country', 'PUT', ['paises', '99001'], {
          body: JSON.stringify(
            {
              nombre: 'País Demo Postman Actualizado',
              nombreCorto: 'PD',
              capital: 'Capital Demo',
              nacionalidad: 'Demense',
              idiomas: 'Español',
            },
            null,
            2,
          ),
        }),
        req('List Sectors', 'GET', ['sectores'], {}),
        req('Get Sector', 'GET', ['sectores', '{{warehouse_id}}'], {
          description: 'Uses `warehouse_id` as `sectores.identificador` placeholder.',
        }),
        req('Create Sector', 'POST', ['sectores'], {
          status: [201, 409],
          body: JSON.stringify(
            { nombreSector: 'Sector Demo Postman', codigoSector: 'SDP', responsableSector: null },
            null,
            2,
          ),
        }),
      ],
    ),
    folder(
      '12. Health / Debug',
      'Unauthenticated health checks (use server root, not `/api` prefix).',
      [
        {
          name: 'Health — API',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{server_root}}/api/health',
              host: ['{{server_root}}'],
              path: ['api', 'health'],
            },
            description: 'API health. `server_root` defaults to `http://localhost:3000`.',
          },
          event: tests(200),
          response: [],
        },
        {
          name: 'Health — DB',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{server_root}}/api/health/db',
              host: ['{{server_root}}'],
              path: ['api', 'health', 'db'],
            },
            description: 'Database connectivity check. May return 503 if DB is down.',
          },
          event: tests([200, 503]),
          response: [],
        },
        {
          name: 'Health — Root',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{server_root}}/health',
              host: ['{{server_root}}'],
              path: ['health'],
            },
          },
          event: tests(200),
          response: [],
        },
      ],
    ),
  ],
};

const environment = {
  id: 'crownbid-employee-env',
  name: 'CrownBid Employee API',
  values: [
    { key: 'base_url', value: 'http://localhost:3000/api', type: 'default', enabled: true },
    { key: 'server_root', value: 'http://localhost:3000', type: 'default', enabled: true },
    { key: 'access_token', value: '', type: 'secret', enabled: true },
    { key: 'refresh_token', value: '', type: 'secret', enabled: true, description: 'Not used — API is stateless JWT without refresh tokens' },
    { key: 'employee_email', value: 'admin@crownbid.local', type: 'default', enabled: true },
    { key: 'employee_password', value: 'EmpleadoAdmin2026!', type: 'secret', enabled: true },
    { key: 'employee_id', value: '1', type: 'default', enabled: true },
    { key: 'auction_id', value: '1', type: 'default', enabled: true },
    { key: 'article_id', value: '1', type: 'default', enabled: true },
    { key: 'item_id', value: '1', type: 'default', enabled: true },
    { key: 'client_id', value: '1', type: 'default', enabled: true },
    { key: 'user_id', value: '1', type: 'default', enabled: true },
    { key: 'bid_id', value: '', type: 'default', enabled: true, description: 'No employee bid endpoints — client-only' },
    { key: 'image_id', value: '1', type: 'default', enabled: true },
    { key: 'category_id', value: '1', type: 'default', enabled: true, description: 'Reused as paises.numero for country GET demo' },
    { key: 'warehouse_id', value: '1', type: 'default', enabled: true, description: 'Reused as sectores.identificador for sector GET demo' },
    { key: 'insurance_policy_id', value: '', type: 'default', enabled: true, description: 'No assign-insurance API endpoint exists' },
    { key: 'payment_method_id', value: '1', type: 'default', enabled: true },
  ],
  _postman_variable_scope: 'environment',
};

writeFileSync(
  join(__dirname, 'employee-api.postman_collection.json'),
  JSON.stringify(collection, null, 2),
);
writeFileSync(
  join(__dirname, 'employee-api.postman_environment.json'),
  JSON.stringify(environment, null, 2),
);

console.log('Generated employee-api.postman_collection.json and employee-api.postman_environment.json');
