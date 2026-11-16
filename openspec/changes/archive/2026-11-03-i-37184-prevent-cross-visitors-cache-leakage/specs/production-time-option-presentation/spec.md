# Spec Delta

## MODIFIED Requirements

### Requirement: Holiday delivery location is resolved and selectable
The Holiday Period widget SHALL classify the delivery location as US or international. It SHALL initialize that location from the previously selected shipping country, then the detected-country cookie, then a fixed US default, using the first nonblank source. It SHALL display the selected location above the options and allow the customer to change it for the current product configuration.

#### Scenario: Previously selected shipping country exists
- **WHEN** a previously selected shipping country is available
- **THEN** the widget derives its initial US or international location from that country without consulting lower-priority sources

#### Scenario: Only detected country exists
- **WHEN** no previously selected shipping country is available and the detected-country cookie contains a country
- **THEN** the widget derives its initial location from the detected country

#### Scenario: No customer country data exists
- **WHEN** neither a previously selected shipping country nor a detected country is available
- **THEN** the widget initializes its location as US

#### Scenario: Customer changes delivery location
- **WHEN** the customer changes the widget location between US and international
- **THEN** the visible Holiday options update to the selected location
