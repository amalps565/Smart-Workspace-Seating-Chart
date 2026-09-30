package com.smartworkspace.seating;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class SeatingApplication {

	public static void main(String[] args) {
		SpringApplication.run(SeatingApplication.class, args);
	}

}
