/*
  CrownBid — SQL Server schema (MVP)
  ---------------------------------------------------------------------------
  Diseño relacional (SQL Server) para este TP:
  - Integridad referencial fuerte (FK, CHECK) acorde a reglas de negocio
    documentadas en el contrato OpenAPI / api-docs (subastas, pujas, medios
    de pago, consignaciones, liquidaciones, incumplimientos, notificaciones).
  - Transacciones ACID para pujas, pagos y liquidaciones sin condiciones de
    carrera no auditables.

  Cuentas de cobro del vendedor vs medios de pago del comprador:
  - seller_payout_accounts almacena datos bancarios SOLO para acreditación
    de netos al vendedor (dominio distinto al de débito/compra).
  - payment_methods modela instrumentos con los que el usuario PUJA y paga
    bienes ganados; no deben mezclarse en una misma tabla por segregación
    de riesgo y claridad contable.

  Datos sensibles de tarjeta:
  - No se persisten PAN completos ni CVV/CVC. Solo token/máscara y metadatos
    en details_json (p. ej. últimos 4 dígitos, marca); el procesamiento
    sensible queda a PSP o vault externo.

  Sesión en vivo única:
  - Índice único filtrado en live_auction_sessions garantiza a lo sumo UNA
    fila activa (released_at IS NULL) por usuario, alineado a la regla TP
    y al conflicto 409 del contrato en la sesión en vivo.

  Visibilidad de precios (catálogo público vs autenticado):
  - Los montos viven en tablas canónicas (p. ej. auction_items.base_price);
    el contrato expone DTO con o sin campos monetarios. Duplicar tablas
    públicas/privadas generaría drift; la política es de capa API.

  Estados de usuario (CHECK):
  - pending_verification / approved / rejected / suspended. El contrato API
    puede combinar flags (mustChangePassword, accountServiceSuspended, etc.);
    el backend mapea a estas columnas y BIT auxiliares.

  Ejecución: base de datos vacía o usar el bloque DROP al final comentado
  solo en desarrollo. Codificación UTF-8 recomendada.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO


CREATE TABLE dbo.countries (
    id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_countries_id DEFAULT NEWID(),
    iso_code        NVARCHAR(2)      NOT NULL,
    name            NVARCHAR(120)    NOT NULL,
    created_at      DATETIME2        NOT NULL CONSTRAINT DF_countries_created DEFAULT SYSUTCDATETIME(),
    updated_at      DATETIME2        NULL,
    CONSTRAINT PK_countries PRIMARY KEY CLUSTERED (id),
    CONSTRAINT UQ_countries_iso UNIQUE (iso_code)
);
GO

CREATE TABLE dbo.auctioneers (
    id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_auctioneers_id DEFAULT NEWID(),
    first_name          NVARCHAR(100)    NOT NULL,
    last_name           NVARCHAR(100)    NOT NULL,
    license_number      NVARCHAR(100)    NOT NULL,
    region              NVARCHAR(150)    NULL,
    created_at          DATETIME2        NOT NULL CONSTRAINT DF_auctioneers_created DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2        NULL,
    CONSTRAINT PK_auctioneers PRIMARY KEY CLUSTERED (id)
);
GO

CREATE UNIQUE INDEX UX_auctioneers_license_number ON dbo.auctioneers (license_number);
GO

CREATE TABLE dbo.users (
    id                                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_users_id DEFAULT NEWID(),
    first_name                          NVARCHAR(100)    NOT NULL,
    last_name                           NVARCHAR(100)    NOT NULL,
    email                               NVARCHAR(320)    NOT NULL,
    password_hash                       NVARCHAR(500)    NOT NULL,
    document_id                         NVARCHAR(80)     NOT NULL,
    address                             NVARCHAR(500)    NOT NULL,
    country_code                        NVARCHAR(2)      NOT NULL,
    photo_url                           NVARCHAR(2000)   NULL,
    document_front_image_url            NVARCHAR(2000)   NOT NULL,
    document_back_image_url             NVARCHAR(2000)   NOT NULL,
    category                            NVARCHAR(20)     NOT NULL CONSTRAINT CK_users_category
        CHECK (category IN (N'common', N'special', N'silver', N'gold', N'platinum')),
    status                              NVARCHAR(30)     NOT NULL CONSTRAINT CK_users_status
        CHECK (status IN (N'pending_verification', N'approved', N'rejected', N'suspended')),
    requires_password_change            BIT              NOT NULL CONSTRAINT DF_users_req_pw DEFAULT (1),
    bidding_blocked_until_resolved      BIT              NOT NULL CONSTRAINT DF_users_bid_block DEFAULT (0),
    delinquent_win_id                   UNIQUEIDENTIFIER NULL,
    account_service_suspended           BIT              NOT NULL CONSTRAINT DF_users_acct_susp DEFAULT (0),
    created_at                          DATETIME2        NOT NULL CONSTRAINT DF_users_created DEFAULT SYSUTCDATETIME(),
    updated_at                          DATETIME2        NULL,
    CONSTRAINT PK_users PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_users_countries FOREIGN KEY (country_code) REFERENCES dbo.countries (iso_code)
);
GO

CREATE UNIQUE INDEX UX_users_email ON dbo.users (email);
GO

CREATE TABLE dbo.revoked_tokens (
    id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_revoked_tokens_id DEFAULT NEWID(),
    user_id         UNIQUEIDENTIFIER NULL,
    jwt_id          NVARCHAR(450)    NOT NULL,
    expires_at_utc  DATETIME2        NOT NULL,
    revoked_at_utc  DATETIME2        NOT NULL CONSTRAINT DF_revoked_tokens_revoked DEFAULT SYSUTCDATETIME(),
    reason          NVARCHAR(200)    NULL,
    created_at      DATETIME2        NOT NULL CONSTRAINT DF_revoked_tokens_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_revoked_tokens PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_revoked_tokens_users FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
    CONSTRAINT UQ_revoked_tokens_jti UNIQUE (jwt_id)
);
GO

CREATE TABLE dbo.password_reset_tokens (
    id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_password_reset_id DEFAULT NEWID(),
    user_id         UNIQUEIDENTIFIER NOT NULL,
    token_hash      NVARCHAR(200)    NOT NULL,
    expires_at_utc  DATETIME2        NOT NULL,
    used_at_utc     DATETIME2        NULL,
    created_at      DATETIME2        NOT NULL CONSTRAINT DF_pwd_reset_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_password_reset_tokens PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_password_reset_users FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_password_reset_user ON dbo.password_reset_tokens (user_id);
CREATE INDEX IX_password_reset_token_hash ON dbo.password_reset_tokens (token_hash);
GO

CREATE INDEX IX_revoked_tokens_expires ON dbo.revoked_tokens (expires_at_utc);
GO

CREATE TABLE dbo.auctions (
    id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_auctions_id DEFAULT NEWID(),
    title                   NVARCHAR(300)    NOT NULL,
    description             NVARCHAR(MAX)    NULL,
    cover_image_url         NVARCHAR(2000)   NULL,
    category_required       NVARCHAR(20)     NOT NULL CONSTRAINT CK_auctions_cat_req
        CHECK (category_required IN (N'common', N'special', N'silver', N'gold', N'platinum')),
    currency                NVARCHAR(3)      NOT NULL CONSTRAINT CK_auctions_currency
        CHECK (currency IN (N'ARS', N'USD')),
    start_date              DATETIME2        NOT NULL,
    end_date                DATETIME2        NOT NULL,
    status                  NVARCHAR(20)     NOT NULL CONSTRAINT CK_auctions_status
        CHECK (status IN (N'scheduled', N'live', N'closed')),
    location                NVARCHAR(500)    NULL,
    auctioneer_id           UNIQUEIDENTIFIER NOT NULL,
    featured                BIT              NOT NULL CONSTRAINT DF_auctions_featured DEFAULT (0),
    streaming_url           NVARCHAR(2000)   NULL,
    created_at              DATETIME2        NOT NULL CONSTRAINT DF_auctions_created DEFAULT SYSUTCDATETIME(),
    updated_at              DATETIME2        NULL,
    CONSTRAINT PK_auctions PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_auctions_auctioneers FOREIGN KEY (auctioneer_id) REFERENCES dbo.auctioneers (id)
);
GO

CREATE INDEX IX_auctions_status ON dbo.auctions (status);
CREATE INDEX IX_auctions_featured ON dbo.auctions (featured) WHERE featured = 1;
GO

CREATE TABLE dbo.auction_items (
    id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_auction_items_id DEFAULT NEWID(),
    auction_id              UNIQUEIDENTIFIER NOT NULL,
    piece_number            NVARCHAR(50)     NOT NULL,
    title                   NVARCHAR(400)    NOT NULL,
    description             NVARCHAR(MAX)    NULL,
    status                  NVARCHAR(40)     NOT NULL CONSTRAINT CK_auction_items_status
        CHECK (status IN (N'unsold', N'active', N'sold', N'company_purchased_at_base', N'withdrawn')),
    base_price              DECIMAL(18, 2)   NOT NULL,
    current_bid             DECIMAL(18, 2)   NOT NULL CONSTRAINT DF_auction_items_current_bid DEFAULT (0),
    current_owner_id        UNIQUEIDENTIFIER NULL,
    artist_or_designer      NVARCHAR(300)    NULL,
    creation_or_era_label   NVARCHAR(200)    NULL,
    historical_context      NVARCHAR(MAX)    NULL,
    created_at              DATETIME2        NOT NULL CONSTRAINT DF_auction_items_created DEFAULT SYSUTCDATETIME(),
    updated_at              DATETIME2        NULL,
    CONSTRAINT PK_auction_items PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_auction_items_auctions FOREIGN KEY (auction_id) REFERENCES dbo.auctions (id) ON DELETE CASCADE,
    CONSTRAINT FK_auction_items_owner FOREIGN KEY (current_owner_id) REFERENCES dbo.users (id),
    CONSTRAINT UQ_auction_items_piece UNIQUE (auction_id, piece_number),
    CONSTRAINT CK_auction_items_base_nonneg CHECK (base_price >= 0),
    CONSTRAINT CK_auction_items_current_nonneg CHECK (current_bid >= 0)
);
GO

CREATE INDEX IX_auction_items_auction ON dbo.auction_items (auction_id);
CREATE INDEX IX_auction_items_status ON dbo.auction_items (status);
GO

EXEC sys.sp_addextendedproperty
    @name = N'MS_Description', @value = N'Oferta vigente del ítem. 0 = aún no hubo pujas (solo referencia de reglas: base_price).',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'auction_items',
    @level2type = N'COLUMN', @level2name = N'current_bid';
GO

CREATE TABLE dbo.auction_item_images (
    id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_auction_item_images_id DEFAULT NEWID(),
    auction_item_id     UNIQUEIDENTIFIER NOT NULL,
    image_url           NVARCHAR(2000)   NOT NULL,
    sort_order          INT              NOT NULL CONSTRAINT DF_auction_item_img_sort DEFAULT (0),
    created_at          DATETIME2        NOT NULL CONSTRAINT DF_auction_item_images_created DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2        NULL,
    CONSTRAINT PK_auction_item_images PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_auction_item_images_item FOREIGN KEY (auction_item_id) REFERENCES dbo.auction_items (id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_auction_item_images_item ON dbo.auction_item_images (auction_item_id);
GO

CREATE TABLE dbo.auction_item_components (
    id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_aic_id DEFAULT NEWID(),
    auction_item_id     UNIQUEIDENTIFIER NOT NULL,
    title               NVARCHAR(300)    NOT NULL,
    description         NVARCHAR(MAX)    NULL,
    sort_order          INT              NOT NULL CONSTRAINT DF_aic_sort DEFAULT (0),
    created_at          DATETIME2        NOT NULL CONSTRAINT DF_aic_created DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2        NULL,
    CONSTRAINT PK_auction_item_components PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_aic_item FOREIGN KEY (auction_item_id) REFERENCES dbo.auction_items (id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_auction_item_components_item ON dbo.auction_item_components (auction_item_id);
GO

CREATE TABLE dbo.bids (
    id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_bids_id DEFAULT NEWID(),
    auction_id          UNIQUEIDENTIFIER NOT NULL,
    auction_item_id     UNIQUEIDENTIFIER NOT NULL,
    user_id             UNIQUEIDENTIFIER NOT NULL,
    amount              DECIMAL(18, 2)   NOT NULL,
    is_winning          BIT              NOT NULL CONSTRAINT DF_bids_winning DEFAULT (0),
    created_at          DATETIME2        NOT NULL CONSTRAINT DF_bids_created DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2        NULL,
    CONSTRAINT PK_bids PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_bids_auction FOREIGN KEY (auction_id) REFERENCES dbo.auctions (id),
    CONSTRAINT FK_bids_item FOREIGN KEY (auction_item_id) REFERENCES dbo.auction_items (id),
    CONSTRAINT FK_bids_user FOREIGN KEY (user_id) REFERENCES dbo.users (id),
    CONSTRAINT CK_bids_amount_positive CHECK (amount > 0)
);
GO

CREATE INDEX IX_bids_auction ON dbo.bids (auction_id);
CREATE INDEX IX_bids_auction_item ON dbo.bids (auction_item_id);
CREATE INDEX IX_bids_user ON dbo.bids (user_id);
CREATE INDEX IX_bids_item_created ON dbo.bids (auction_item_id, created_at DESC);
CREATE INDEX IX_bids_auction_created ON dbo.bids (auction_id, created_at DESC);
GO

/*
  UX_bids_one_winning_per_item: a lo sumo una puja marcada como ganadora por ítem.
  La creación/actualización de pujas debe ser TRANSACCIONAL en la aplicación:
  (a) poner is_winning = 0 en la fila ganadora previa del mismo auction_item_id (si existe),
  (b) insertar o marcar la nueva puja con is_winning = 1,
  (c) actualizar auction_items.current_bid al monto de esa puja.
*/
CREATE UNIQUE INDEX UX_bids_one_winning_per_item
    ON dbo.bids (auction_item_id)
    WHERE is_winning = 1;
GO

CREATE TABLE dbo.live_auction_sessions (
    id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_live_sessions_id DEFAULT NEWID(),
    user_id             UNIQUEIDENTIFIER NOT NULL,
    auction_id          UNIQUEIDENTIFIER NOT NULL,
    connected_since     DATETIME2        NOT NULL CONSTRAINT DF_live_connected DEFAULT SYSUTCDATETIME(),
    released_at         DATETIME2        NULL,
    created_at          DATETIME2        NOT NULL CONSTRAINT DF_live_sessions_created DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2        NULL,
    CONSTRAINT PK_live_auction_sessions PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_live_user FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
    CONSTRAINT FK_live_auction FOREIGN KEY (auction_id) REFERENCES dbo.auctions (id)
);
GO

CREATE UNIQUE INDEX UX_live_one_active_per_user
    ON dbo.live_auction_sessions (user_id)
    WHERE released_at IS NULL;
GO

CREATE INDEX IX_live_sessions_auction ON dbo.live_auction_sessions (auction_id);
GO

CREATE TABLE dbo.payment_methods (
    id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_pm_id DEFAULT NEWID(),
    user_id                 UNIQUEIDENTIFIER NOT NULL,
    type                    NVARCHAR(30)     NOT NULL CONSTRAINT CK_pm_type
        CHECK (type IN (N'credit_card', N'bank_account', N'certified_check')),
    display_name            NVARCHAR(200)    NOT NULL,
    holder_name             NVARCHAR(200)    NOT NULL,
    currency                NVARCHAR(3)      NOT NULL CONSTRAINT CK_pm_currency
        CHECK (currency IN (N'ARS', N'USD')),
    reserved_amount         DECIMAL(18, 2)   NULL,
    verification_status     NVARCHAR(20)     NOT NULL CONSTRAINT CK_pm_verif
        CHECK (verification_status IN (N'pending', N'verified', N'rejected')),
    verified                AS (CONVERT(BIT, CASE WHEN verification_status = N'verified' THEN 1 ELSE 0 END)) PERSISTED NOT NULL,
    status                  NVARCHAR(20)     NOT NULL CONSTRAINT CK_pm_status
        CHECK (status IN (N'active', N'inactive')),
    details_json            NVARCHAR(MAX)    NULL,
    created_at              DATETIME2        NOT NULL CONSTRAINT DF_pm_created DEFAULT SYSUTCDATETIME(),
    updated_at              DATETIME2        NULL,
    CONSTRAINT PK_payment_methods PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_pm_users FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
    CONSTRAINT CK_pm_reserved_nonneg CHECK (reserved_amount IS NULL OR reserved_amount >= 0)
);
GO

CREATE INDEX IX_payment_methods_user ON dbo.payment_methods (user_id);
GO

EXEC sys.sp_addextendedproperty
    @name = N'MS_Description', @value = N'No almacenar PAN completo ni CVV; usar tokenización/máscara en details_json.',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'payment_methods',
    @level2type = N'COLUMN', @level2name = N'details_json';
GO

CREATE TABLE dbo.winner_payments (
    id                              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_wp_id DEFAULT NEWID(),
    winner_user_id                  UNIQUEIDENTIFIER NOT NULL,
    auction_id                      UNIQUEIDENTIFIER NOT NULL,
    auction_item_id                 UNIQUEIDENTIFIER NOT NULL,
    winning_bid_id                  UNIQUEIDENTIFIER NOT NULL,
    bid_amount                      DECIMAL(18, 2)   NOT NULL,
    commission_amount               DECIMAL(18, 2)   NOT NULL,
    shipping_cost                   DECIMAL(18, 2)   NOT NULL CONSTRAINT DF_wp_ship_cost DEFAULT (0),
    total_amount                    DECIMAL(18, 2)   NOT NULL,
    currency                        NVARCHAR(3)      NOT NULL CONSTRAINT CK_wp_currency
        CHECK (currency IN (N'ARS', N'USD')),
    shipping_address                NVARCHAR(800)    NULL,
    payment_deadline                DATETIME2        NOT NULL,
    settled                         BIT              NOT NULL CONSTRAINT DF_wp_settled DEFAULT (0),
    payment_method_id               UNIQUEIDENTIFIER NULL,
    penalty_percent                 DECIMAL(5, 2)    NULL,
    penalty_amount                  DECIMAL(18, 2)   NULL,
    regularization_deadline         DATETIME2        NULL,
    bidding_blocked_until_payment   BIT              NOT NULL CONSTRAINT DF_wp_bid_block DEFAULT (0),
    pickup_in_person                BIT              NOT NULL CONSTRAINT DF_wp_pickup DEFAULT (0),
    created_at                      DATETIME2        NOT NULL CONSTRAINT DF_wp_created DEFAULT SYSUTCDATETIME(),
    updated_at                      DATETIME2        NULL,
    CONSTRAINT PK_winner_payments PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_wp_winner FOREIGN KEY (winner_user_id) REFERENCES dbo.users (id),
    CONSTRAINT FK_wp_auction FOREIGN KEY (auction_id) REFERENCES dbo.auctions (id),
    CONSTRAINT FK_wp_item FOREIGN KEY (auction_item_id) REFERENCES dbo.auction_items (id),
    CONSTRAINT FK_wp_bid FOREIGN KEY (winning_bid_id) REFERENCES dbo.bids (id),
    CONSTRAINT FK_wp_pm FOREIGN KEY (payment_method_id) REFERENCES dbo.payment_methods (id),
    CONSTRAINT CK_wp_bid_amount_nonneg CHECK (bid_amount >= 0),
    CONSTRAINT CK_wp_commission_nonneg CHECK (commission_amount >= 0),
    CONSTRAINT CK_wp_shipping_nonneg CHECK (shipping_cost >= 0),
    CONSTRAINT CK_wp_total_nonneg CHECK (total_amount >= 0),
    CONSTRAINT CK_wp_penalty_percent CHECK (penalty_percent IS NULL OR penalty_percent >= 0),
    CONSTRAINT CK_wp_penalty_amount CHECK (penalty_amount IS NULL OR penalty_amount >= 0)
);
GO

ALTER TABLE dbo.users
    ADD CONSTRAINT FK_users_delinquent_win
    FOREIGN KEY (delinquent_win_id) REFERENCES dbo.winner_payments (id);
GO

CREATE INDEX IX_winner_payments_winner ON dbo.winner_payments (winner_user_id);
CREATE INDEX IX_winner_payments_item ON dbo.winner_payments (auction_item_id);
GO

CREATE TABLE dbo.item_submissions (
    id                                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_is_id DEFAULT NEWID(),
    user_id                                 UNIQUEIDENTIFIER NOT NULL,
    title                                   NVARCHAR(400)    NOT NULL,
    description                             NVARCHAR(MAX)    NULL,
    artist_or_designer                      NVARCHAR(300)    NULL,
    historical_context                      NVARCHAR(MAX)    NULL,
    declared_ownership_accepted             BIT              NOT NULL CONSTRAINT DF_is_own DEFAULT (0),
    lawful_origin_declaration_accepted      BIT              NOT NULL CONSTRAINT DF_is_lawful DEFAULT (0),
    status                                  NVARCHAR(30)     NOT NULL CONSTRAINT CK_item_sub_status
        CHECK (status IN (N'pending', N'under_review', N'accepted', N'rejected', N'terms_proposed',
                         N'scheduled', N'cancelled', N'sold')),
    rejection_reason                        NVARCHAR(MAX)    NULL,
    scheduled_auction_id                    UNIQUEIDENTIFIER NULL,
    auction_item_id                         UNIQUEIDENTIFIER NULL,
    base_price                              DECIMAL(18, 2)   NULL,
    commission_percent                      DECIMAL(5, 2)    NULL,
    terms_proposal_expires_at               DATETIME2        NULL,
    terms_proposal_venue                    NVARCHAR(300)    NULL,
    terms_proposal_event_at                 DATETIME2        NULL,
    physical_shipment_status                NVARCHAR(30)     NOT NULL CONSTRAINT DF_is_ship DEFAULT (N'not_required')
        CONSTRAINT CK_is_ship CHECK (physical_shipment_status IN (N'not_required', N'pending', N'shipped', N'received')),
    shipment_tracking_number                NVARCHAR(120)    NULL,
    shipment_carrier                        NVARCHAR(120)    NULL,
    shipping_address                        NVARCHAR(500)    NULL,
    shipping_city                           NVARCHAR(120)    NULL,
    shipping_country                        NVARCHAR(2)      NULL,
    shipping_venue_name                     NVARCHAR(300)    NULL,
    shipping_scheduled_preview_at           DATETIME2        NULL,
    shipping_deadline                       DATETIME2        NULL,
    shipping_instructions                   NVARCHAR(MAX)    NULL,
    created_at                              DATETIME2        NOT NULL CONSTRAINT DF_is_created DEFAULT SYSUTCDATETIME(),
    updated_at                              DATETIME2        NULL,
    CONSTRAINT PK_item_submissions PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_is_user FOREIGN KEY (user_id) REFERENCES dbo.users (id),
    CONSTRAINT FK_is_scheduled_auction FOREIGN KEY (scheduled_auction_id) REFERENCES dbo.auctions (id),
    CONSTRAINT FK_item_submissions_auction_item FOREIGN KEY (auction_item_id) REFERENCES dbo.auction_items (id)
);
GO

CREATE INDEX IX_item_submissions_user ON dbo.item_submissions (user_id);
CREATE INDEX IX_item_submissions_status ON dbo.item_submissions (status);
GO

EXEC sys.sp_addextendedproperty
    @name = N'MS_Description', @value = N'Ítem de catálogo generado tras inspección, aceptación de términos y programación; NULL hasta que exista el lote.',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'item_submissions',
    @level2type = N'COLUMN', @level2name = N'auction_item_id';
GO

CREATE TABLE dbo.item_submission_images (
    id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_isi_id DEFAULT NEWID(),
    item_submission_id      UNIQUEIDENTIFIER NOT NULL,
    image_url               NVARCHAR(2000)   NOT NULL,
    sort_order              INT              NOT NULL CONSTRAINT DF_isi_sort DEFAULT (0),
    created_at              DATETIME2        NOT NULL CONSTRAINT DF_isi_created DEFAULT SYSUTCDATETIME(),
    updated_at              DATETIME2        NULL,
    CONSTRAINT PK_item_submission_images PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_isi_sub FOREIGN KEY (item_submission_id) REFERENCES dbo.item_submissions (id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_item_submission_images_submission ON dbo.item_submission_images (item_submission_id);
GO

CREATE TABLE dbo.item_submission_components (
    id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_isc_id DEFAULT NEWID(),
    item_submission_id      UNIQUEIDENTIFIER NOT NULL,
    title                   NVARCHAR(300)    NOT NULL,
    description             NVARCHAR(MAX)    NULL,
    sort_order              INT              NOT NULL CONSTRAINT DF_isc_sort DEFAULT (0),
    created_at              DATETIME2        NOT NULL CONSTRAINT DF_isc_created DEFAULT SYSUTCDATETIME(),
    updated_at              DATETIME2        NULL,
    CONSTRAINT PK_item_submission_components PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_isc_sub FOREIGN KEY (item_submission_id) REFERENCES dbo.item_submissions (id) ON DELETE CASCADE
);
GO

CREATE INDEX IX_item_submission_components_submission ON dbo.item_submission_components (item_submission_id);
GO

CREATE TABLE dbo.seller_payout_accounts (
    id                          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_spa_id DEFAULT NEWID(),
    user_id                     UNIQUEIDENTIFIER NOT NULL,
    bank_name                   NVARCHAR(200)    NOT NULL,
    country                     NVARCHAR(2)      NOT NULL,
    account_number_masked       NVARCHAR(80)     NOT NULL,
    account_number_token        NVARCHAR(200)    NULL,
    swift_bic                   NVARCHAR(20)     NULL,
    currency                    NVARCHAR(3)      NOT NULL CONSTRAINT CK_spa_currency
        CHECK (currency IN (N'ARS', N'USD')),
    holder_name                 NVARCHAR(200)    NOT NULL,
    is_default                  BIT              NOT NULL CONSTRAINT DF_spa_default DEFAULT (0),
    created_at                  DATETIME2        NOT NULL CONSTRAINT DF_spa_created DEFAULT SYSUTCDATETIME(),
    updated_at                  DATETIME2        NULL,
    CONSTRAINT PK_seller_payout_accounts PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_spa_user FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
    CONSTRAINT FK_spa_country FOREIGN KEY (country) REFERENCES dbo.countries (iso_code)
);
GO

CREATE INDEX IX_seller_payout_user ON dbo.seller_payout_accounts (user_id);
GO

CREATE UNIQUE INDEX UX_seller_payout_one_default_per_user
    ON dbo.seller_payout_accounts (user_id)
    WHERE is_default = 1;
GO

CREATE TABLE dbo.seller_settlements (
    id                              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ss_id DEFAULT NEWID(),
    user_id                         UNIQUEIDENTIFIER NOT NULL,
    submission_id                   UNIQUEIDENTIFIER NOT NULL,
    auction_id                      UNIQUEIDENTIFIER NOT NULL,
    item_id                         UNIQUEIDENTIFIER NOT NULL,
    hammer_amount                   DECIMAL(18, 2)   NOT NULL,
    commission_amount               DECIMAL(18, 2)   NOT NULL,
    net_to_seller                   DECIMAL(18, 2)   NOT NULL,
    currency                        NVARCHAR(3)      NOT NULL CONSTRAINT CK_ss_currency
        CHECK (currency IN (N'ARS', N'USD')),
    transfer_status                 NVARCHAR(20)     NOT NULL CONSTRAINT CK_ss_transfer
        CHECK (transfer_status IN (N'pending', N'processing', N'completed', N'failed')),
    payout_bank_name                NVARCHAR(200)    NOT NULL,
    payout_country                  NVARCHAR(2)      NOT NULL,
    payout_account_number_masked    NVARCHAR(80)     NOT NULL,
    payout_swift_bic                NVARCHAR(20)     NULL,
    payout_currency                 NVARCHAR(3)      NOT NULL CONSTRAINT CK_ss_payout_currency
        CHECK (payout_currency IN (N'ARS', N'USD')),
    payout_holder_name              NVARCHAR(200)    NOT NULL,
    payout_account_snapshot_at      DATETIME2        NOT NULL CONSTRAINT DF_ss_snap DEFAULT SYSUTCDATETIME(),
    created_at                      DATETIME2        NOT NULL CONSTRAINT DF_ss_created DEFAULT SYSUTCDATETIME(),
    updated_at                      DATETIME2        NULL,
    CONSTRAINT PK_seller_settlements PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_ss_user FOREIGN KEY (user_id) REFERENCES dbo.users (id),
    CONSTRAINT FK_ss_sub FOREIGN KEY (submission_id) REFERENCES dbo.item_submissions (id),
    CONSTRAINT FK_ss_auction FOREIGN KEY (auction_id) REFERENCES dbo.auctions (id),
    CONSTRAINT FK_ss_item FOREIGN KEY (item_id) REFERENCES dbo.auction_items (id),
    CONSTRAINT CK_ss_hammer_nonneg CHECK (hammer_amount >= 0),
    CONSTRAINT CK_ss_commission_nonneg CHECK (commission_amount >= 0),
    CONSTRAINT CK_ss_net_nonneg CHECK (net_to_seller >= 0)
);
GO

CREATE INDEX IX_seller_settlements_user ON dbo.seller_settlements (user_id);
GO

CREATE TABLE dbo.seller_settlement_deductions (
    id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ssd_id DEFAULT NEWID(),
    seller_settlement_id    UNIQUEIDENTIFIER NOT NULL,
    reason                  NVARCHAR(500)    NOT NULL,
    amount                  DECIMAL(18, 2)   NOT NULL,
    created_at              DATETIME2        NOT NULL CONSTRAINT DF_ssd_created DEFAULT SYSUTCDATETIME(),
    updated_at              DATETIME2        NULL,
    CONSTRAINT PK_seller_settlement_deductions PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_ssd_settlement FOREIGN KEY (seller_settlement_id) REFERENCES dbo.seller_settlements (id) ON DELETE CASCADE,
    CONSTRAINT CK_ssd_amount_positive CHECK (amount >= 0)
);
GO

CREATE TABLE dbo.insurance_policies (
    id                              UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ip_id DEFAULT NEWID(),
    beneficiary_user_id             UNIQUEIDENTIFIER NOT NULL,
    insurer                         NVARCHAR(200)    NOT NULL,
    policy_number                   NVARCHAR(120)    NOT NULL,
    currency                        NVARCHAR(3)      NOT NULL CONSTRAINT CK_ip_currency
        CHECK (currency IN (N'ARS', N'USD')),
    baseline_insured_amount         DECIMAL(18, 2)   NOT NULL,
    upgraded_insured_amount         DECIMAL(18, 2)   NOT NULL,
    last_coverage_upgrade_at        DATETIME2        NULL,
    coverage_start_at               DATETIME2        NOT NULL,
    coverage_end_at                 DATETIME2        NOT NULL,
    depot_location                  NVARCHAR(400)    NULL,
    created_at                      DATETIME2        NOT NULL CONSTRAINT DF_ip_created DEFAULT SYSUTCDATETIME(),
    updated_at                      DATETIME2        NULL,
    CONSTRAINT PK_insurance_policies PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_ip_beneficiary FOREIGN KEY (beneficiary_user_id) REFERENCES dbo.users (id),
    CONSTRAINT CK_ip_baseline_nonneg CHECK (baseline_insured_amount >= 0),
    CONSTRAINT CK_ip_upgraded_nonneg CHECK (upgraded_insured_amount >= 0)
);
GO

CREATE TABLE dbo.insurance_policy_items (
    id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ipi_id DEFAULT NEWID(),
    insurance_policy_id     UNIQUEIDENTIFIER NOT NULL,
    auction_item_id         UNIQUEIDENTIFIER NOT NULL,
    created_at              DATETIME2        NOT NULL CONSTRAINT DF_ipi_created DEFAULT SYSUTCDATETIME(),
    updated_at              DATETIME2        NULL,
    CONSTRAINT PK_insurance_policy_items PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_ipi_policy FOREIGN KEY (insurance_policy_id) REFERENCES dbo.insurance_policies (id) ON DELETE CASCADE,
    CONSTRAINT FK_ipi_item FOREIGN KEY (auction_item_id) REFERENCES dbo.auction_items (id),
    CONSTRAINT UQ_ipi_policy_item UNIQUE (insurance_policy_id, auction_item_id)
);
GO

CREATE TABLE dbo.notifications (
    id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_notif_id DEFAULT NEWID(),
    user_id             UNIQUEIDENTIFIER NOT NULL,
    type                NVARCHAR(40)     NOT NULL CONSTRAINT CK_notifications_type
        CHECK (type IN (N'won', N'outbid', N'leading', N'starts_soon', N'payment_failed', N'payment_due',
                        N'item_submission_update', N'settlement_update', N'insurance_update')),
    title               NVARCHAR(300)    NOT NULL,
    message             NVARCHAR(MAX)    NOT NULL,
    is_read             BIT              NOT NULL CONSTRAINT DF_notif_read DEFAULT (0),
    auction_id          UNIQUEIDENTIFIER NULL,
    item_id             UNIQUEIDENTIFIER NULL,
    win_id              UNIQUEIDENTIFIER NULL,
    created_at          DATETIME2        NOT NULL CONSTRAINT DF_notif_created DEFAULT SYSUTCDATETIME(),
    updated_at          DATETIME2        NULL,
    CONSTRAINT PK_notifications PRIMARY KEY CLUSTERED (id),
    CONSTRAINT FK_notif_user FOREIGN KEY (user_id) REFERENCES dbo.users (id) ON DELETE CASCADE,
    CONSTRAINT FK_notif_auction FOREIGN KEY (auction_id) REFERENCES dbo.auctions (id),
    CONSTRAINT FK_notif_item FOREIGN KEY (item_id) REFERENCES dbo.auction_items (id),
    CONSTRAINT FK_notif_win FOREIGN KEY (win_id) REFERENCES dbo.winner_payments (id)
);
GO

CREATE INDEX IX_notifications_user_read ON dbo.notifications (user_id, is_read);
GO

EXEC sys.sp_addextendedproperty
    @name = N'MS_Description', @value = N'API: propiedad booleana "read"; en BD: is_read.',
    @level0type = N'SCHEMA', @level0name = N'dbo',
    @level1type = N'TABLE',  @level1name = N'notifications',
    @level2type = N'COLUMN', @level2name = N'is_read';
GO