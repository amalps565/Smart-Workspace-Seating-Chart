-- Core schema for the hot-desking map. Never edit this file after it is merged; add a new migration.

create table users (
	id            bigserial primary key,
	username      text not null,
	password_hash text not null,
	display_name  text not null,
	constraint uq_users_username unique (username)
);

create table floors (
	id             bigserial primary key,
	name           text not null,
	rows           int  not null check (rows > 0),
	cols           int  not null check (cols > 0),
	neighbour_mode text not null default 'ORTHOGONAL' check (neighbour_mode in ('ORTHOGONAL', 'ALL'))
);

create table cells (
	id       bigserial primary key,
	floor_id bigint not null references floors (id),
	row      int    not null check (row >= 0),
	col      int    not null check (col >= 0),
	type     text   not null check (type in ('DESK', 'WALKWAY', 'WALL', 'ROOM')),
	label    text,
	-- Last value taken from desk_status_seq for this desk (0 = never changed).
	last_seq bigint not null default 0,
	constraint uq_cells_floor_row_col unique (floor_id, row, col),
	-- Lets bookings reference (desk, floor) together so a booking's floor always matches its desk.
	constraint uq_cells_id_floor unique (id, floor_id)
);

create table bookings (
	id         bigserial primary key,
	desk_id    bigint      not null,
	floor_id   bigint      not null references floors (id),
	user_id    bigint      not null references users (id),
	date       date        not null,
	created_at timestamptz not null default now(),
	constraint fk_bookings_desk_floor foreign key (desk_id, floor_id) references cells (id, floor_id),
	constraint uq_bookings_desk_date unique (desk_id, date),
	constraint uq_bookings_user_date unique (user_id, date)
);

-- Snapshots and spacing checks read one floor and date.
create index ix_bookings_floor_date on bookings (floor_id, date);

-- Version number for every desk status change (book or cancel).
create sequence desk_status_seq;
