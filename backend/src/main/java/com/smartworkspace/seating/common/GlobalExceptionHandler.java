package com.smartworkspace.seating.common;

import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Maps every error to the shared {@code {code, message}} body. Never leaks stack traces or internals.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ErrorResponse> handleApi(ApiException ex) {
		return error(ex.getStatus(), ex.getCode(), ex.getMessage());
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ErrorResponse> handleInvalidBody(MethodArgumentNotValidException ex) {
		String message = ex.getBindingResult()
			.getFieldErrors()
			.stream()
			.map((error) -> error.getField() + " " + error.getDefaultMessage())
			.sorted()
			.collect(Collectors.joining("; "));
		return error(HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR,
				message.isEmpty() ? "The request is invalid." : message);
	}

	@ExceptionHandler(HandlerMethodValidationException.class)
	ResponseEntity<ErrorResponse> handleInvalidParameters(HandlerMethodValidationException ex) {
		return error(HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR, "The request parameters are invalid.");
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException ex) {
		return error(HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR, "The request body is missing or malformed.");
	}

	@ExceptionHandler(MissingServletRequestParameterException.class)
	ResponseEntity<ErrorResponse> handleMissingParameter(MissingServletRequestParameterException ex) {
		if ("date".equals(ex.getParameterName())) {
			return error(HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_DATE, "The date parameter is required.");
		}
		return error(HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR,
				"The parameter '" + ex.getParameterName() + "' is required.");
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
		if ("date".equals(ex.getName())) {
			return error(HttpStatus.BAD_REQUEST, ErrorCodes.INVALID_DATE, "The date must be formatted as YYYY-MM-DD.");
		}
		return error(HttpStatus.BAD_REQUEST, ErrorCodes.VALIDATION_ERROR,
				"The value of '" + ex.getName() + "' is invalid.");
	}

	@ExceptionHandler(NoResourceFoundException.class)
	ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException ex) {
		return error(HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND, "Not found.");
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
		return error(HttpStatus.METHOD_NOT_ALLOWED, ErrorCodes.METHOD_NOT_ALLOWED,
				"Method " + ex.getMethod() + " is not supported here.");
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
		// Services translate the constraints they expect; anything reaching here is still a conflict, not a 500.
		log.warn("Unmapped data integrity violation", ex);
		return error(HttpStatus.CONFLICT, ErrorCodes.CONFLICT, "The request conflicts with existing data.");
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
		log.error("Unexpected error", ex);
		return error(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.INTERNAL_ERROR, "An unexpected error occurred.");
	}

	private static ResponseEntity<ErrorResponse> error(HttpStatus status, String code, String message) {
		return ResponseEntity.status(status).body(new ErrorResponse(code, message));
	}

}
