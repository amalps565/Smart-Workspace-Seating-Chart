package com.smartworkspace.seating;

import org.springframework.boot.SpringApplication;

public class TestSeatingApplication {

	public static void main(String[] args) {
		SpringApplication.from(SeatingApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
