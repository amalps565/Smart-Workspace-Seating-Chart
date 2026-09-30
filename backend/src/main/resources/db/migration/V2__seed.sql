-- Demo users (password for all: "password") and sample floors.

insert into users (username, password_hash, display_name) values
	('alice', '{bcrypt}$2a$10$S5z393sGl0F3fHjzeZ0EbufvODNlITUjRoqN1scjVfhNShHxIRXOS', 'Alice Anders'),
	('bob',   '{bcrypt}$2a$10$jGQkcI3c7LTtjlQbC0R7auMM6Ij08KSouusQePsU6chFU0H1pKxIC', 'Bob Brown'),
	('carol', '{bcrypt}$2a$10$OCaFilEjXR/E9xN98y.FJu3D0ZC/2TSYsS2nwc2b9pRBcRdoF.Q.a', 'Carol Chen'),
	('dave',  '{bcrypt}$2a$10$Ir/AaM5eifblp6dsVM94XuuSdUiFrwEvTvEG/gxC3A4W2iwpuA.7a', 'Dave Diaz'),
	('erin',  '{bcrypt}$2a$10$x3/HKnJx1yIQgsgHJ.scCOtf41HPZ0wS/MUxmBR8iD0o5Df8Plamy', 'Erin Evans');

-- Floor 3: 8 x 12, orthogonal neighbours, a walkway down column 6 (0-based).
insert into floors (name, rows, cols, neighbour_mode) values ('Floor 3', 8, 12, 'ORTHOGONAL');

insert into cells (floor_id, row, col, type, label)
select f.id,
	r,
	c,
	case when c = 6 then 'WALKWAY' else 'DESK' end,
	case when c = 6 then null else '3-' || chr(65 + r) || (c + 1) end
from floors f
	cross join generate_series(0, 7) as r
	cross join generate_series(0, 11) as c
where f.name = 'Floor 3'
order by r, c;

-- Floor 4: 4 x 6, all desks, neighbours include diagonals.
insert into floors (name, rows, cols, neighbour_mode) values ('Floor 4', 4, 6, 'ALL');

insert into cells (floor_id, row, col, type, label)
select f.id, r, c, 'DESK', '4-' || chr(65 + r) || (c + 1)
from floors f
	cross join generate_series(0, 3) as r
	cross join generate_series(0, 5) as c
where f.name = 'Floor 4'
order by r, c;
